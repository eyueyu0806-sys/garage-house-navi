begin;
create table public.social_drafts (
 id uuid primary key default gen_random_uuid(),
 property_id uuid references public.properties(id) on delete set null,
 property_version text not null check (length(property_version)=64),
 property_name text not null,
 instagram_text text not null check (char_length(instagram_text) between 1 and 2200),
 threads_text text not null check (char_length(threads_text) between 1 and 500),
 image_path text not null,
 status text not null default 'draft' check (status in ('draft','locked')),
 due_at timestamptz,
 created_by uuid references auth.users(id) on delete set null,
 confirmed_by uuid references auth.users(id) on delete set null,
 confirmed_at timestamptz,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(property_id,property_version)
);
create index social_drafts_created on public.social_drafts(created_at desc);
create index social_drafts_creator on public.social_drafts(created_by);
create index social_drafts_confirmer on public.social_drafts(confirmed_by);
create table public.social_deliveries (
 id uuid primary key default gen_random_uuid(),
 draft_id uuid not null references public.social_drafts(id) on delete cascade,
 channel_id text not null,
 channel_name text not null,
 service text not null check (service in ('instagram','threads')),
 status text not null default 'pending' check (status in ('pending','sending','scheduled','failed','uncertain')),
 due_at timestamptz not null,
 buffer_post_id text,
 error_message text,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(draft_id,channel_id)
);
alter table public.social_drafts enable row level security;
alter table public.social_deliveries enable row level security;
revoke all on public.social_drafts,public.social_deliveries from anon,authenticated;
grant select on public.social_drafts,public.social_deliveries to authenticated;
grant all on public.social_drafts,public.social_deliveries to service_role;
create policy admin_social_drafts_read on public.social_drafts for select to authenticated using ((select public.is_admin()));
create policy admin_social_deliveries_read on public.social_deliveries for select to authenticated using ((select public.is_admin()));
create trigger touch_social_drafts before update on public.social_drafts for each row execute function public.touch_updated_at();
create trigger touch_social_deliveries before update on public.social_deliveries for each row execute function public.touch_updated_at();

-- One transaction records both the confirmed content and every intended destination.
-- Only the authenticated application server can call this RPC, after admin checks.
create function public.reserve_social_draft(p_id uuid,p_instagram text,p_threads text,p_due_at timestamptz,p_channels jsonb,p_admin uuid)
returns boolean language plpgsql security invoker set search_path='' as $$
declare d public.social_drafts;
begin
 if not exists(select 1 from public.admin_profiles where id=p_admin) then raise exception 'FORBIDDEN'; end if;
 if p_due_at <= now() or p_due_at > now()+interval '30 days' then raise exception 'INVALID_DATE'; end if;
 if jsonb_typeof(p_channels)<>'array' or jsonb_array_length(p_channels) not between 1 and 2 then raise exception 'INVALID_CHANNELS'; end if;
 update public.social_drafts set instagram_text=p_instagram,threads_text=p_threads,due_at=p_due_at,
  confirmed_by=p_admin,confirmed_at=now(),status='locked'
  where id=p_id and status='draft' returning * into d;
 if not found then return false; end if;
 insert into public.social_deliveries(draft_id,channel_id,channel_name,service,due_at)
 select p_id,c->>'id',c->>'name',c->>'service',p_due_at from jsonb_array_elements(p_channels) c;
 return true;
end;
$$;
revoke all on function public.reserve_social_draft(uuid,text,text,timestamptz,jsonb,uuid) from public,anon,authenticated;
grant execute on function public.reserve_social_draft(uuid,text,text,timestamptz,jsonb,uuid) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('social-assets','social-assets',false,8388608,array['image/jpeg']);
-- No public storage policies: previews and Buffer downloads use limited-lifetime signed URLs.
commit;
