begin;

create extension if not exists pg_trgm with schema extensions;

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  display_name text not null check (char_length(btrim(display_name)) between 1 and 300),
  search_name text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.vendors is
  'Private vendor directory. Import records out-of-band; never commit vendor names in repository seeds.';

create or replace function private.normalize_vendor_search_name(value text)
returns text language sql immutable set search_path = '' as $$
  select regexp_replace(
    lower(
      regexp_replace(
        regexp_replace(btrim(coalesce(value, '')), '^บ[.]', 'บริษัท ', 'i'),
        '^หจก[.]?', 'ห้างหุ้นส่วนจำกัด ', 'i'
      )
    ),
    '[[:space:][:punct:]]+',
    '',
    'g'
  )
$$;

create or replace function public.set_vendor_search_name()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  new.display_name = btrim(new.display_name);
  new.search_name = private.normalize_vendor_search_name(new.display_name);
  return new;
end;
$$;

update public.vendors
set display_name = btrim(display_name),
    search_name = private.normalize_vendor_search_name(display_name)
where display_name is distinct from btrim(display_name)
   or search_name is distinct from private.normalize_vendor_search_name(display_name);

drop trigger if exists vendors_set_search_name on public.vendors;
create trigger vendors_set_search_name
before insert or update of display_name on public.vendors
for each row execute procedure public.set_vendor_search_name();

drop trigger if exists vendors_updated_at on public.vendors;
create trigger vendors_updated_at
before update on public.vendors
for each row execute procedure public.set_updated_at();

create index if not exists vendors_active_display_name_idx
on public.vendors (display_name) where active;

create index if not exists vendors_active_search_trgm_idx
on public.vendors using gin (search_name extensions.gin_trgm_ops) where active;

alter table public.vendors enable row level security;

drop policy if exists vendors_read on public.vendors;
drop policy if exists vendors_insert_managers on public.vendors;
drop policy if exists vendors_update_managers on public.vendors;
drop policy if exists vendors_delete_managers on public.vendors;
drop policy if exists vendors_manage on public.vendors;

create policy vendors_read on public.vendors
for select to authenticated
using (
  active
  or coalesce(
    private.current_role() in ('procurement_staff', 'head_procurement', 'admin'),
    false
  )
);

create policy vendors_insert_managers on public.vendors
for insert to authenticated
with check (
  coalesce(
    private.current_role() in ('procurement_staff', 'head_procurement', 'admin'),
    false
  )
);

create policy vendors_update_managers on public.vendors
for update to authenticated
using (
  coalesce(
    private.current_role() in ('procurement_staff', 'head_procurement', 'admin'),
    false
  )
)
with check (
  coalesce(
    private.current_role() in ('procurement_staff', 'head_procurement', 'admin'),
    false
  )
);

revoke all on table public.vendors from public;
revoke all on table public.vendors from anon;
revoke all on table public.vendors from authenticated;
grant select, insert, update on table public.vendors to authenticated;

commit;
