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
    and (
      v.search_name like '%' || normalized_query || '%'
      or extensions.word_similarity(normalized_query, v.search_name) >= 0.40
    )
  order by
    case
      when v.search_name = normalized_query then 0
      when v.search_name like normalized_query || '%' then 1
      when v.search_name like '%' || normalized_query || '%' then 2
      else 3
    end,
    extensions.word_similarity(normalized_query, v.search_name) desc,
    v.display_name
  limit bounded_limit;
end;
$$;

revoke all on function public.search_vendors(text, integer) from public;
grant execute on function public.search_vendors(text, integer) to authenticated;

commit;
