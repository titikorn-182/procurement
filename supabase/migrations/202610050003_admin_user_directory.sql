begin;

create or replace function public.admin_list_user_profiles()
returns table (
  id uuid,
  full_name text,
  email text,
  position_title text,
  role public.app_role,
  department_id uuid,
  active boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'administrator permission required';
  end if;

  return query
  select
    p.id,
    p.full_name,
    coalesce(u.email::text, ''),
    coalesce(p.position_title, ''),
    p.role,
    p.department_id,
    p.active
  from public.profiles p
  join auth.users u on u.id = p.id
  order by nullif(p.full_name, '') nulls last, lower(coalesce(u.email::text, ''));
end;
$$;

revoke all on function public.admin_list_user_profiles() from public;
grant execute on function public.admin_list_user_profiles() to authenticated;

commit;
