-- Keep the admin predicate outside the exposed public API schema.
begin;
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_profiles where id = (select auth.uid())
  );
$$;
revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to anon, authenticated;

drop policy admin_properties on public.properties;
drop policy published_properties on public.properties;
create policy property_read on public.properties
  for select to anon, authenticated
  using (status = 'published' or (select private.is_admin()));
create policy property_insert on public.properties
  for insert to authenticated
  with check ((select private.is_admin()));
create policy property_update on public.properties
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy property_delete on public.properties
  for delete to authenticated
  using ((select private.is_admin()));

drop policy admin_images on public.property_images;
drop policy published_images on public.property_images;
create policy property_image_read on public.property_images
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.properties p
      where p.id = property_id and p.status = 'published'
    ) or (select private.is_admin())
  );
create policy property_image_insert on public.property_images
  for insert to authenticated
  with check ((select private.is_admin()));
create policy property_image_update on public.property_images
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));
create policy property_image_delete on public.property_images
  for delete to authenticated
  using ((select private.is_admin()));

drop policy admin_sources on public.property_sources;
create policy admin_sources on public.property_sources for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
drop policy admin_inquiries_read on public.inquiries;
drop policy admin_inquiries_update on public.inquiries;
create policy admin_inquiries_read on public.inquiries for select to authenticated
  using ((select private.is_admin()));
create policy admin_inquiries_update on public.inquiries for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
drop policy admin_requests_read on public.property_requests;
drop policy admin_requests_update on public.property_requests;
create policy admin_requests_read on public.property_requests for select to authenticated
  using ((select private.is_admin()));
create policy admin_requests_update on public.property_requests for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
drop policy admin_photo_access on storage.objects;
create policy admin_photo_access on storage.objects for all to authenticated
  using (bucket_id = 'property-images' and (select private.is_admin()))
  with check (bucket_id = 'property-images' and (select private.is_admin()));

drop function public.is_admin();
create index property_requests_prefecture_idx
  on public.property_requests(prefecture) where prefecture is not null;
commit;
