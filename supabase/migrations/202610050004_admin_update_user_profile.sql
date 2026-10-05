begin;

create or replace function public.update_user_admin_settings(
  target_user_id uuid,
  new_full_name text,
  new_position_title text,
  new_role public.app_role,
  new_department_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_admin() then
    raise exception 'administrator permission required';
  end if;

  if new_full_name is null or char_length(btrim(new_full_name)) not between 2 and 200 then
    raise exception 'full name must contain between 2 and 200 characters';
  end if;

  if char_length(btrim(new_position_title)) > 200 then
    raise exception 'position title must not exceed 200 characters';
  end if;

  update public.profiles
  set
    full_name = btrim(new_full_name),
    position_title = nullif(btrim(new_position_title), ''),
    role = new_role,
    department_id = new_department_id,
    updated_at = now()
  where id = target_user_id;

  if not found then
    raise exception 'profile not found';
  end if;
end;
$$;

revoke all on function public.update_user_admin_settings(
  uuid,
  text,
  text,
  public.app_role,
  uuid
) from public;
grant execute on function public.update_user_admin_settings(
  uuid,
  text,
  text,
  public.app_role,
  uuid
) to authenticated;

commit;
