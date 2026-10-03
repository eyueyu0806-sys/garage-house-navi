begin;
create function public.reorder_property_images(p_property_id uuid,p_ids uuid[]) returns void
language plpgsql security invoker set search_path='' as $$
declare expected integer;
begin
 if not public.is_admin() then raise exception 'FORBIDDEN'; end if;
 perform 1 from public.properties where id=p_property_id for update;
 select count(*) into expected from public.property_images where property_id=p_property_id;
 if expected<>cardinality(p_ids) or expected<>(select count(distinct x) from unnest(p_ids) x) or exists(select 1 from unnest(p_ids) x where not exists(select 1 from public.property_images where id=x and property_id=p_property_id)) then raise exception 'INVALID_IMAGE_ORDER'; end if;
 update public.property_images i set sort_order=o.ordinality-1 from unnest(p_ids) with ordinality o(id,ordinality) where i.id=o.id and i.property_id=p_property_id;
end; $$;
revoke all on function public.reorder_property_images(uuid,uuid[]) from public,anon;
grant execute on function public.reorder_property_images(uuid,uuid[]) to authenticated;
commit;
