-- Keep existing admin RPCs working without exposing a SECURITY DEFINER
-- function from the public API schema. RLS limits the profile row to auth.uid().
begin;
create function public.is_admin()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select exists (
    select 1 from public.admin_profiles where id = (select auth.uid())
  );
$$;
revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;
commit;
