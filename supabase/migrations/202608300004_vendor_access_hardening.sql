begin;

create or replace function public.search_vendors(
  vendor_query text,
  max_results integer default 20
)
returns table(id uuid, display_name text, total_count bigint)
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_query text;
  bounded_limit integer;
begin
  if not exists (
    select 1 from public.profiles
    where profiles.id = (select auth.uid()) and profiles.active = true
  ) then
    raise exception 'active profile required';
  end if;

  normalized_query := private.normalize_vendor_search_name(left(coalesce(vendor_query, ''), 120));
  if char_length(normalized_query) < 2 then return; end if;
  bounded_limit := greatest(1, least(coalesce(max_results, 20), 20));

  return query
  select
    v.id,
    v.display_name,
    count(*) over() as total_count
  from public.vendors v
  where v.active = true
    and v.search_name like '%' || normalized_query || '%'
  order by v.display_name
  limit bounded_limit;
end;
$$;

create or replace function public.resolve_vendor(vendor_id uuid)
returns table(id uuid, display_name text)
language sql
stable
security definer
set search_path = ''
as $$
  select v.id, v.display_name
  from public.vendors v
  where v.id = vendor_id
    and v.active = true
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.active = true
    )
$$;

revoke all on table public.vendors from authenticated;
revoke all on function public.search_vendors(text, integer) from public;
revoke all on function public.resolve_vendor(uuid) from public;
grant execute on function public.search_vendors(text, integer) to authenticated;
grant execute on function public.resolve_vendor(uuid) to authenticated;

commit;
