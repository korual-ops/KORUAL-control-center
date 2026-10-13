-- Applied in KORUAL Supabase project, migration 20261013001502.

create or replace function public.erp_is_platform_admin()
returns boolean language sql stable security invoker set search_path=''
as $$
 select coalesce((select auth.jwt() -> 'app_metadata' ->> 'role')='admin',false)
 or coalesce((select auth.jwt() -> 'app_metadata' ->> 'korual_role')='platform_admin',false)
$$;
create or replace function public.erp_is_business_member(p_business_id uuid, p_allowed_roles text[] default array['owner','manager','staff'])
returns boolean language sql stable security invoker set search_path=''
as $$
 select public.erp_is_platform_admin() or exists (
   select 1 from public.erp_business_members m
   where m.business_id=p_business_id and m.user_id=(select auth.uid())
     and m.status='active' and m.business_role=any(p_allowed_roles)
 )
$$;

