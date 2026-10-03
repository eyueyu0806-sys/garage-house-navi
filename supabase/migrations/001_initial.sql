-- GARAGE HOUSE NAVI / Supabase migration 001
-- Run once in a fresh Supabase project. No public sign-up creates admins.
begin;
create table public.prefectures (slug text primary key, name text not null, code text not null unique);
insert into public.prefectures (slug,name,code) values
('hokkaido','北海道','01'),
('aomori','青森県','02'),
('iwate','岩手県','03'),
('miyagi','宮城県','04'),
('akita','秋田県','05'),
('yamagata','山形県','06'),
('fukushima','福島県','07'),
('ibaraki','茨城県','08'),
('tochigi','栃木県','09'),
('gunma','群馬県','10'),
('saitama','埼玉県','11'),
('chiba','千葉県','12'),
('tokyo','東京都','13'),
('kanagawa','神奈川県','14'),
('niigata','新潟県','15'),
('toyama','富山県','16'),
('ishikawa','石川県','17'),
('fukui','福井県','18'),
('yamanashi','山梨県','19'),
('nagano','長野県','20'),
('gifu','岐阜県','21'),
('shizuoka','静岡県','22'),
('aichi','愛知県','23'),
('mie','三重県','24'),
('shiga','滋賀県','25'),
('kyoto','京都府','26'),
('osaka','大阪府','27'),
('hyogo','兵庫県','28'),
('nara','奈良県','29'),
('wakayama','和歌山県','30'),
('tottori','鳥取県','31'),
('shimane','島根県','32'),
('okayama','岡山県','33'),
('hiroshima','広島県','34'),
('yamaguchi','山口県','35'),
('tokushima','徳島県','36'),
('kagawa','香川県','37'),
('ehime','愛媛県','38'),
('kochi','高知県','39'),
('fukuoka','福岡県','40'),
('saga','佐賀県','41'),
('nagasaki','長崎県','42'),
('kumamoto','熊本県','43'),
('oita','大分県','44'),
('miyazaki','宮崎県','45'),
('kagoshima','鹿児島県','46'),
('okinawa','沖縄県','47');
create table public.admin_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create or replace function public.is_admin() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.admin_profiles where id=(select auth.uid()));
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
create table public.properties (
 id uuid primary key default gen_random_uuid(),
 property_name text not null check(length(property_name) between 1 and 160),
 slug text not null unique check(slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
 property_code text not null unique,
 prefecture text not null references public.prefectures(slug),
 city text not null,
 city_slug text,
 town text,
 full_address text,
 station text,
 walking_minutes integer check(walking_minutes >= 0),
 rent integer not null check(rent >= 0),
 management_fee integer check(management_fee >= 0),
 deposit integer check(deposit >= 0),
 key_money integer check(key_money >= 0),
 layout text,
 floor_area numeric(10,2) check(floor_area > 0),
 built_at date,
 structure text,
 floor text,
 garage_count integer check(garage_count >= 0),
 garage_width_mm integer check(garage_width_mm > 0),
 garage_depth_mm integer check(garage_depth_mm > 0),
 garage_height_mm integer check(garage_height_mm > 0),
 entrance_width_mm integer check(entrance_width_mm > 0),
 entrance_height_mm integer check(entrance_height_mm > 0),
 garage_type text,
 shutter boolean,
 electric_shutter boolean,
 ev_charger boolean,
 motorcycle boolean,
 large_vehicle boolean,
 direct_access boolean,
 pet boolean,
 diy boolean,
 soho boolean,
 office_use boolean,
 other_features text,
 catch_copy text,
 description text,
 transaction_type text,
 available_from text,
 contract_period text,
 insurance text,
 guarantee text,
 other_costs text,
 renewal_fee text,
 cancellation_terms text,
 information_checked_at date,
 next_update_at date,
 status text not null default 'draft' check(status in ('draft','published','closed')),
 featured boolean not null default false,
 published_at timestamptz,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index properties_public_location on public.properties(prefecture,city) where status='published';
create index properties_public_rent on public.properties(rent) where status='published';
create index properties_public_new on public.properties(published_at desc) where status='published';
create index properties_public_garage on public.properties(garage_count,garage_width_mm,garage_depth_mm) where status='published';
create table public.property_images (
 id uuid primary key default gen_random_uuid(), property_id uuid not null references public.properties(id) on delete cascade,
 storage_path text not null unique, alt text not null default '', sort_order integer not null default 0 check(sort_order>=0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(storage_path like property_id::text || '/%')
);
create index property_images_property on public.property_images(property_id,sort_order);
create table public.property_sources (
 property_id uuid primary key references public.properties(id) on delete cascade,
 source_company text,
 management_company text,
 contact_name text,
 contact_phone text,
 contact_email text,
 original_url text,
 advertising_permission boolean not null default false,
 permission_confirmed_at date,
 last_availability_check date,
 ad_fee integer check(ad_fee >= 0),
 brokerage_terms text,
 internal_notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.inquiries (
 id uuid primary key default gen_random_uuid(), submission_id uuid not null unique,
 property_id uuid references public.properties(id) on delete set null, property_name_snapshot text not null,
 name text not null check(length(name) between 1 and 100), email text, phone text,
 inquiry_type text not null check(inquiry_type in ('空室状況を確認したい','内見したい','初期費用を知りたい','その他')),
 message text not null check(length(message) between 1 and 5000), move_in text, car_model text, car_count integer check(car_count between 0 and 50), motorcycle_count integer check(motorcycle_count between 0 and 50), other_wishes text,
 source_url text not null, consent_at timestamptz not null default now(), consent_version text not null default '1.0',
 status text not null default 'new' check(status in ('new','contacted','viewing','application','closed_won','closed_lost')), internal_notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check (nullif(trim(email),'') is not null or nullif(trim(phone),'') is not null)
);
create index inquiries_status_date on public.inquiries(status,created_at desc);
create index inquiries_property on public.inquiries(property_id);
create table public.property_requests (
 id uuid primary key default gen_random_uuid(), submission_id uuid not null unique,
 name text not null check(length(name) between 1 and 100), email text, phone text,
 prefecture text references public.prefectures(slug), city text, budget integer check(budget>=0), layout text,
 garage_count integer check(garage_count between 0 and 50), car_model text, motorcycle_count integer check(motorcycle_count between 0 and 50), must_haves text, move_in text, message text,
 source_url text not null, consent_at timestamptz not null default now(), consent_version text not null default '1.0',
 status text not null default 'new' check(status in ('new','contacted','viewing','application','closed_won','closed_lost')), internal_notes text,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check (nullif(trim(email),'') is not null or nullif(trim(phone),'') is not null)
);
create index requests_status_date on public.property_requests(status,created_at desc);
-- Only hashed network identifiers. Rolling fixed hour window shared across instances.
create table public.rate_limits (key text primary key, window_start timestamptz not null default now(), hits integer not null default 1);
create or replace function public.consume_rate_limit(p_key text, p_limit integer default 5) returns boolean language plpgsql security invoker set search_path='' as $$
declare n integer;
begin
 delete from public.rate_limits where window_start < now()-interval '2 days';
 insert into public.rate_limits(key) values(p_key)
 on conflict(key) do update set hits=case when rate_limits.window_start < now()-interval '1 hour' then 1 else rate_limits.hits+1 end,
 window_start=case when rate_limits.window_start < now()-interval '1 hour' then now() else rate_limits.window_start end
 returning hits into n;
 return n <= p_limit;
end; $$;
revoke all on function public.consume_rate_limit(text,integer) from public, anon, authenticated;
grant execute on function public.consume_rate_limit(text,integer) to service_role;
create function public.touch_updated_at() returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now(); return new; end; $$;
create trigger touch_admin_profiles before update on public.admin_profiles for each row execute function public.touch_updated_at();
create trigger touch_properties before update on public.properties for each row execute function public.touch_updated_at();
create trigger touch_property_images before update on public.property_images for each row execute function public.touch_updated_at();
create trigger touch_property_sources before update on public.property_sources for each row execute function public.touch_updated_at();
create trigger touch_inquiries before update on public.inquiries for each row execute function public.touch_updated_at();
create trigger touch_property_requests before update on public.property_requests for each row execute function public.touch_updated_at();
create function public.validate_publication() returns trigger language plpgsql set search_path='' as $$
begin
 if new.status='published' then
  if not exists(select 1 from public.property_sources where property_id=new.id and advertising_permission=true and permission_confirmed_at is not null) then
   raise exception 'PUBLICATION_PERMISSION_REQUIRED';
  end if;
  if not exists(select 1 from public.property_images where property_id=new.id) then raise exception 'PUBLICATION_IMAGE_REQUIRED'; end if;
  if new.transaction_type is null or new.information_checked_at is null or new.next_update_at is null or new.next_update_at < current_date then raise exception 'PUBLICATION_DISCLOSURES_REQUIRED'; end if;
  new.published_at=coalesce(new.published_at,now());
 end if;
 return new;
end; $$;
create trigger validate_publication before insert or update on public.properties for each row execute function public.validate_publication();
-- Revoking advertising permission also withdraws the public listing.
create function public.withdraw_unapproved_property() returns trigger language plpgsql set search_path='' as $$
begin
 if not new.advertising_permission or new.permission_confirmed_at is null then
 update public.properties set status='draft' where id=new.property_id and status='published';
 end if; return new;
end; $$;
create trigger withdraw_unapproved_property after update on public.property_sources for each row execute function public.withdraw_unapproved_property();
create function public.save_property(p_id uuid, p_property jsonb, p_source jsonb) returns uuid
language plpgsql security invoker set search_path='' as $$
declare target_id uuid; r public.properties; s public.property_sources;
begin
 if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
 if p_id is null then
  insert into public.properties(property_name,slug,property_code,prefecture,city,rent)
  values(p_property->>'property_name',p_property->>'slug',p_property->>'property_code',p_property->>'prefecture',p_property->>'city',(p_property->>'rent')::integer) returning id into target_id;
 else
  target_id=p_id;
  perform 1 from public.properties where id=target_id for update;
  if not found then raise exception 'PROPERTY_NOT_FOUND'; end if;
 end if;
 select * into r from public.properties where id=target_id;
 r=jsonb_populate_record(r,p_property);
 s=jsonb_populate_record(null::public.property_sources,p_source);
 insert into public.property_sources(property_id,source_company,management_company,contact_name,contact_phone,contact_email,original_url,advertising_permission,permission_confirmed_at,last_availability_check,ad_fee,brokerage_terms,internal_notes)
 values(target_id,s.source_company,s.management_company,s.contact_name,s.contact_phone,s.contact_email,s.original_url,s.advertising_permission,s.permission_confirmed_at,s.last_availability_check,s.ad_fee,s.brokerage_terms,s.internal_notes)
 on conflict(property_id) do update set source_company=excluded.source_company,management_company=excluded.management_company,contact_name=excluded.contact_name,contact_phone=excluded.contact_phone,contact_email=excluded.contact_email,original_url=excluded.original_url,advertising_permission=excluded.advertising_permission,permission_confirmed_at=excluded.permission_confirmed_at,last_availability_check=excluded.last_availability_check,ad_fee=excluded.ad_fee,brokerage_terms=excluded.brokerage_terms,internal_notes=excluded.internal_notes;
 update public.properties set property_name=r.property_name,slug=r.slug,property_code=r.property_code,prefecture=r.prefecture,city=r.city,city_slug=r.city_slug,town=r.town,full_address=r.full_address,station=r.station,walking_minutes=r.walking_minutes,rent=r.rent,management_fee=r.management_fee,deposit=r.deposit,key_money=r.key_money,layout=r.layout,floor_area=r.floor_area,built_at=r.built_at,structure=r.structure,floor=r.floor,garage_count=r.garage_count,garage_width_mm=r.garage_width_mm,garage_depth_mm=r.garage_depth_mm,garage_height_mm=r.garage_height_mm,entrance_width_mm=r.entrance_width_mm,entrance_height_mm=r.entrance_height_mm,garage_type=r.garage_type,shutter=r.shutter,electric_shutter=r.electric_shutter,ev_charger=r.ev_charger,motorcycle=r.motorcycle,large_vehicle=r.large_vehicle,direct_access=r.direct_access,pet=r.pet,diy=r.diy,soho=r.soho,office_use=r.office_use,other_features=r.other_features,catch_copy=r.catch_copy,description=r.description,transaction_type=r.transaction_type,available_from=r.available_from,contract_period=r.contract_period,insurance=r.insurance,guarantee=r.guarantee,other_costs=r.other_costs,renewal_fee=r.renewal_fee,cancellation_terms=r.cancellation_terms,information_checked_at=r.information_checked_at,next_update_at=r.next_update_at,status=r.status,featured=r.featured where id=target_id;
 return target_id;
end; $$;
revoke all on function public.save_property(uuid,jsonb,jsonb) from public, anon;
grant execute on function public.save_property(uuid,jsonb,jsonb) to authenticated;
alter table public.prefectures enable row level security;
revoke all on public.prefectures from anon, authenticated;
alter table public.admin_profiles enable row level security;
revoke all on public.admin_profiles from anon, authenticated;
alter table public.properties enable row level security;
revoke all on public.properties from anon, authenticated;
alter table public.property_images enable row level security;
revoke all on public.property_images from anon, authenticated;
alter table public.property_sources enable row level security;
revoke all on public.property_sources from anon, authenticated;
alter table public.inquiries enable row level security;
revoke all on public.inquiries from anon, authenticated;
alter table public.property_requests enable row level security;
revoke all on public.property_requests from anon, authenticated;
alter table public.rate_limits enable row level security;
revoke all on public.rate_limits from anon, authenticated;
grant select on public.prefectures,public.properties,public.property_images to anon, authenticated;
grant select on public.admin_profiles to authenticated;
grant insert,update,delete on public.properties,public.property_images to authenticated;
grant select,insert,update,delete on public.property_sources to authenticated;
grant select,update on public.inquiries,public.property_requests to authenticated;
grant all on public.inquiries,public.property_requests,public.rate_limits to service_role;
grant select on public.properties to service_role;
create policy prefectures_read on public.prefectures for select to anon,authenticated using(true);
create policy admin_self on public.admin_profiles for select to authenticated using(id=(select auth.uid()));
create policy published_properties on public.properties for select to anon,authenticated using(status='published');
create policy admin_properties on public.properties for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy published_images on public.property_images for select to anon,authenticated using(exists(select 1 from public.properties where id=property_id and status='published'));
create policy admin_images on public.property_images for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy admin_sources on public.property_sources for all to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy admin_inquiries_read on public.inquiries for select to authenticated using((select public.is_admin()));
create policy admin_inquiries_update on public.inquiries for update to authenticated using((select public.is_admin())) with check((select public.is_admin()));
create policy admin_requests_read on public.property_requests for select to authenticated using((select public.is_admin()));
create policy admin_requests_update on public.property_requests for update to authenticated using((select public.is_admin())) with check((select public.is_admin()));
-- No anonymous lead insertion policy. Only the validated server endpoint may insert.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('property-images','property-images',false,10485760,array['image/jpeg','image/png','image/webp','image/avif']);
create policy published_photo_access on storage.objects for select to anon,authenticated using(bucket_id='property-images' and exists(select 1 from public.property_images i join public.properties p on p.id=i.property_id where i.storage_path=name and p.status='published'));
create policy admin_photo_access on storage.objects for all to authenticated using(bucket_id='property-images' and (select public.is_admin())) with check(bucket_id='property-images' and (select public.is_admin()));
commit;
