begin;

-- Keep the private directory closed to direct client writes. Only this bounded
-- operation may add a name; importing legacy vendor data remains out-of-band.
create or replace function public.admin_create_vendor(vendor_name text)
returns table(id uuid, display_name text, created boolean)
language plpgsql
security definer
set search_path = ''
as $$
declare
  clean_name text := btrim(vendor_name);
  normalized_name text;
  existing_vendor public.vendors%rowtype;
begin
  if not exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.active = true and p.role = 'admin'
  ) then
    raise exception using errcode = '42501', message = 'active administrator required';
  end if;

  if clean_name is null or char_length(clean_name) not between 2 and 200
    or clean_name ~ '[[:cntrl:]]' then
    raise exception using errcode = '22023', message = 'invalid vendor name';
  end if;
  normalized_name := private.normalize_vendor_search_name(clean_name);
  if char_length(normalized_name) < 2 then
    raise exception using errcode = '22023', message = 'invalid vendor name';
  end if;

  -- Serialize this RPC for equivalent names, including simultaneous clicks/retries,
  -- without adding a unique constraint that could reject existing imported rows.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('admin_create_vendor:' || normalized_name, 0)
  );

  select v.* into existing_vendor
  from public.vendors v
  where v.search_name = normalized_name
  order by v.active desc, v.created_at, v.id
  limit 1;

  if found then
    if not existing_vendor.active then
      raise exception using errcode = '55000', message = 'vendor is inactive';
    end if;
    return query select existing_vendor.id, existing_vendor.display_name, false;
    return;
  end if;

  return query
  insert into public.vendors as v (display_name)
  values (clean_name)
  returning v.id, v.display_name, true;
end;
$$;

revoke all on function public.admin_create_vendor(text) from public, anon;
grant execute on function public.admin_create_vendor(text) to authenticated;

commit;
