begin;
alter table public.social_deliveries
 add column provider_status text,
 add column provider_checked_at timestamptz,
 add column provider_check_error text,
 add column published_at timestamptz,
 add column published_url text;

create table public.social_autopilot_settings (
 id boolean primary key default true check(id),
 enabled boolean not null default false,
 channel_ids jsonb not null default '[]'::jsonb check(jsonb_typeof(channel_ids)='array'),
 updated_at timestamptz not null default now()
);
insert into public.social_autopilot_settings(id) values(true);
create table public.social_autopilot_slots (
 due_at timestamptz primary key,
 draft_id uuid not null references public.social_drafts(id),
 created_at timestamptz not null default now()
);
create index social_autopilot_slots_draft on public.social_autopilot_slots(draft_id);
create table public.social_autopilot_runs (
 id uuid primary key default gen_random_uuid(),
 started_at timestamptz not null default now(),
 finished_at timestamptz,
 status text not null default 'running' check(status in('running','ok','attention','error')),
 report jsonb not null default '{}'::jsonb
);
create index social_autopilot_runs_started on public.social_autopilot_runs(started_at desc);
alter table public.social_autopilot_settings enable row level security;
alter table public.social_autopilot_slots enable row level security;
alter table public.social_autopilot_runs enable row level security;
revoke all on public.social_autopilot_settings,public.social_autopilot_slots,public.social_autopilot_runs from public,anon,authenticated;
grant all on public.social_autopilot_settings,public.social_autopilot_slots,public.social_autopilot_runs to service_role;
grant select on public.social_autopilot_settings,public.social_autopilot_slots,public.social_autopilot_runs to authenticated;
create policy admin_autopilot_settings_read on public.social_autopilot_settings for select to authenticated using((select public.is_admin()));
create policy admin_autopilot_slots_read on public.social_autopilot_slots for select to authenticated using((select public.is_admin()));
create policy admin_autopilot_runs_read on public.social_autopilot_runs for select to authenticated using((select public.is_admin()));

-- One transaction owns the entire slot, regardless of simultaneous cron requests.
-- No human confirmation is fabricated: automation keeps confirmed_by NULL.
create function public.reserve_social_automatic(p_id uuid,p_due_at timestamptz,p_channels jsonb)
returns boolean language plpgsql security invoker set search_path='' as $$
declare d public.social_drafts; settings public.social_autopilot_settings;
begin
 select * into settings from public.social_autopilot_settings where id=true for update;
 if not settings.enabled then raise exception 'AUTOMATION_DISABLED'; end if;
 if p_due_at<=now()+interval '5 minutes' or p_due_at>now()+interval '8 days' then raise exception 'INVALID_DATE'; end if;
 if jsonb_typeof(p_channels)<>'array' or jsonb_array_length(p_channels)<>2 then raise exception 'INVALID_CHANNELS'; end if;
 if exists(select 1 from jsonb_array_elements(p_channels)c where not settings.channel_ids @> jsonb_build_array(c->>'id'))
 or (select count(distinct c->>'id') from jsonb_array_elements(p_channels)c)<>2
 or (select count(distinct c->>'service') from jsonb_array_elements(p_channels)c where c->>'service' in('instagram','threads'))<>2
 then raise exception 'INVALID_CHANNELS'; end if;
 select * into d from public.social_drafts where id=p_id for update;
 if not found or d.status<>'draft' then return false; end if;
 if exists(select 1 from public.social_drafts where property_id=d.property_id and status='locked') then return false; end if;
 if not exists(select 1 from public.properties p join public.property_sources s on s.property_id=p.id
 where p.id=d.property_id and p.status='published' and p.next_update_at >= (p_due_at at time zone 'Asia/Tokyo')::date
 and s.advertising_permission and s.permission_confirmed_at is not null) then raise exception 'PROPERTY_NOT_READY'; end if;
 insert into public.social_autopilot_slots(due_at,draft_id) values(p_due_at,p_id) on conflict do nothing;
 if not found then return false; end if;
 update public.social_drafts set due_at=p_due_at,status='locked',confirmed_by=null,confirmed_at=null where id=p_id;
 insert into public.social_deliveries(draft_id,channel_id,channel_name,service,due_at)
 select p_id,c->>'id',c->>'name',c->>'service',p_due_at from jsonb_array_elements(p_channels)c;
 return true;
end;
$$;
revoke all on function public.reserve_social_automatic(uuid,timestamptz,jsonb) from public,anon,authenticated;
grant execute on function public.reserve_social_automatic(uuid,timestamptz,jsonb) to service_role;
commit;
