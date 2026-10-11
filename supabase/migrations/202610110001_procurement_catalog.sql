begin;

create table public.catalog_imports (
  id uuid primary key default gen_random_uuid(),
  file_name text not null check (char_length(file_name) between 1 and 300),
  file_sha256 text not null unique check (file_sha256 ~ '^[a-f0-9]{64}$'),
  imported_at timestamptz not null default now(),
  imported_by uuid references public.profiles(id),
  summary jsonb not null default '{}' check (jsonb_typeof(summary) = 'object')
);

create table public.catalog_source_rows (
  import_id uuid not null references public.catalog_imports(id),
  sheet_name text not null,
  row_number integer not null check (row_number > 0),
  row_kind text not null check (row_kind in ('header', 'note', 'item', 'history')),
  raw_cells jsonb not null check (jsonb_typeof(raw_cells) = 'array'),
  primary key (import_id, sheet_name, row_number)
);

create table public.catalog_categories (
  code text primary key,
  name text not null unique
);

create table public.catalog_items (
  id uuid primary key default gen_random_uuid(),
  item_code text not null unique check (char_length(item_code) between 1 and 100),
  category_code text not null references public.catalog_categories(code),
  subcategory text not null,
  name text not null check (char_length(btrim(name)) between 1 and 300),
  specification text not null check (char_length(specification) <= 1000),
  unit text not null check (char_length(btrim(unit)) between 1 and 100),
  notes text not null default '',
  image_reference text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.catalog_prices (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.catalog_items(id),
  import_id uuid not null,
  sheet_name text not null,
  row_number integer not null,
  reference_price numeric(14,2) not null check (reference_price >= 0),
  source_name text not null check (char_length(btrim(source_name)) between 1 and 300),
  reference_date date,
  valid_until date,
  status text not null default 'unverified' check (status in ('unverified', 'verified', 'withdrawn')),
  verified_by uuid references public.profiles(id),
  verified_at timestamptz,
  evidence_reference text,
  created_at timestamptz not null default now(),
  foreign key (import_id, sheet_name, row_number)
    references public.catalog_source_rows(import_id, sheet_name, row_number),
  unique (import_id, sheet_name, row_number),
  check (valid_until is null or reference_date is null or valid_until >= reference_date),
  check (status <> 'verified' or (reference_date is not null and verified_by is not null
    and verified_at is not null and nullif(btrim(evidence_reference), '') is not null))
);

create table public.catalog_purchase_history (
  id uuid primary key default gen_random_uuid(),
  import_id uuid not null,
  sheet_name text not null,
  row_number integer not null,
  fiscal_year integer not null check (fiscal_year between 2500 and 2700),
  category_code text not null references public.catalog_categories(code),
  fmis_item_code text not null,
  description text not null,
  purchased_on date not null,
  quantity numeric(12,2) not null check (quantity > 0),
  unit text not null,
  catalog_item_id uuid references public.catalog_items(id),
  foreign key (import_id, sheet_name, row_number)
    references public.catalog_source_rows(import_id, sheet_name, row_number),
  unique (import_id, sheet_name, row_number),
  check (purchased_on >= make_date(fiscal_year - 544, 10, 1)
    and purchased_on < make_date(fiscal_year - 543, 10, 1))
);

create index catalog_items_category_idx on public.catalog_items(category_code, item_code) where active;
create index catalog_prices_latest_idx on public.catalog_prices(item_id, created_at desc, id desc);
create index catalog_history_fiscal_idx on public.catalog_purchase_history(fiscal_year, category_code);

-- Operational records stay private. Requesters receive a bounded DTO through the
-- checked RPC, never the raw workbook or historical purchasing records.
do $$
declare target text;
begin
  foreach target in array array['catalog_imports', 'catalog_source_rows', 'catalog_categories',
    'catalog_items', 'catalog_prices', 'catalog_purchase_history'] loop
    execute format('alter table public.%I enable row level security', target);
    execute format('revoke all on public.%I from public, anon, authenticated', target);
    execute format('grant select, insert, update on public.%I to authenticated', target);
    execute format('create policy catalog_admin_select on public.%I for select to authenticated using (private.has_permission(''system.manage''))', target);
    execute format('create policy catalog_admin_insert on public.%I for insert to authenticated with check (private.has_permission(''system.manage''))', target);
    execute format('create policy catalog_admin_update on public.%I for update to authenticated using (private.has_permission(''system.manage'')) with check (private.has_permission(''system.manage''))', target);
  end loop;
end;
$$;

create function public.search_procurement_catalog(
  catalog_query text default '', category_filter text default '', page_number integer default 0
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare result jsonb;
begin
  if not private.has_permission('request.create') then
    raise exception 'ไม่มีสิทธิ์อ่านแค็ตตาล็อก' using errcode = '42501';
  end if;
  if catalog_query is null or char_length(catalog_query) > 120
    or category_filter is null or char_length(category_filter) > 30
    or page_number is null or page_number < 0 or page_number > 10000 then
    raise exception 'เงื่อนไขค้นหาไม่ถูกต้อง' using errcode = '22023';
  end if;

  with entries as (
    select i.id as item_id, i.item_code, i.category_code, c.name as category_name,
      i.subcategory, i.name, i.specification, i.unit, i.notes,
      p.id as price_id, p.reference_price, p.source_name, p.reference_date, p.valid_until,
      p.status, p.import_id, p.sheet_name, p.row_number, b.file_name,
      (p.valid_until is not null and p.valid_until < (now() at time zone 'Asia/Bangkok')::date) as expired
    from public.catalog_items i
    join public.catalog_categories c on c.code = i.category_code
    -- Pick the newest import first, THEN apply withdrawn. Never resurrect an
    -- older price when the newest version was explicitly withdrawn.
    join lateral (
      select cp.* from public.catalog_prices cp where cp.item_id = i.id
      order by cp.created_at desc, cp.id desc limit 1
    ) p on p.status <> 'withdrawn'
    join public.catalog_imports b on b.id = p.import_id
    where i.active
  ), filtered as (
    select * from entries e
    where (category_filter = '' or e.category_code = category_filter)
      and position(lower(btrim(catalog_query)) in lower(concat_ws(' ', e.item_code, e.name,
        e.specification, e.category_name, e.subcategory))) > 0
  ), paged as (
    select * from filtered order by item_code limit 20 offset page_number * 20
  ) select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(p) order by p.item_code) from paged p), '[]'::jsonb),
    'total', (select count(*) from filtered),
    'categories', coalesce((select jsonb_agg(to_jsonb(c) order by c.code)
      from public.catalog_categories c), '[]'::jsonb)
  ) into result;
  return result;
end;
$$;

revoke all on function public.search_procurement_catalog(text, text, integer) from public, anon;
grant execute on function public.search_procurement_catalog(text, text, integer) to authenticated;
comment on table public.catalog_prices is 'Workbook reference prices; unverified is not a current or certified market price. Never substitute import time for reference_date.';
comment on table public.catalog_purchase_history is 'UBUFMIS purchase history without prices. Do not infer spend or automatically map FMIS codes to catalog items.';

commit;
