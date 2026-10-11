begin;

-- Keep the original workbook and price records intact. Maintenance creates a
-- new price revision, never edits an imported price or a submitted request.
alter table public.catalog_items
  add column version integer not null default 1 check (version > 0),
  add column updated_at timestamptz not null default now(),
  add column updated_by uuid references public.profiles(id),
  add column image_path text;

alter table public.catalog_prices
  add column origin text not null default 'excel' check (origin in ('excel', 'manual')),
  add column created_by uuid references public.profiles(id),
  alter column import_id drop not null,
  alter column sheet_name drop not null,
  alter column row_number drop not null,
  add constraint catalog_price_origin_source check (
    (origin = 'excel' and import_id is not null and sheet_name is not null and row_number is not null)
    or (origin = 'manual' and import_id is null and sheet_name is null and row_number is null
      and created_by is not null)
  );

create table public.catalog_item_revisions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.catalog_items(id),
  version integer not null check (version > 0),
  actor_id uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  before_state jsonb check (before_state is null or jsonb_typeof(before_state) = 'object'),
  after_state jsonb not null check (jsonb_typeof(after_state) = 'object'),
  price_id uuid references public.catalog_prices(id),
  unique (item_id, version)
);
alter table public.catalog_item_revisions enable row level security;
revoke all on public.catalog_item_revisions from public, anon, authenticated;
grant select on public.catalog_item_revisions to authenticated;
create policy catalog_revision_admin_read on public.catalog_item_revisions for select to authenticated
  using (private.has_permission('system.manage'));

-- UI authorization is not sufficient: even an administrator must use the
-- version-checked, audited transaction instead of writing through PostgREST.
revoke insert, update, delete on public.catalog_items, public.catalog_prices from authenticated;
drop policy catalog_admin_insert on public.catalog_items;
drop policy catalog_admin_update on public.catalog_items;
drop policy catalog_admin_insert on public.catalog_prices;
drop policy catalog_admin_update on public.catalog_prices;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('catalog-images', 'catalog-images', false, 2097152,
  array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update set public = false, file_size_limit = 2097152,
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'];

create function private.can_read_catalog_image(object_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select private.has_permission('system.manage') or (
    private.has_permission('request.create') and exists (
      select 1 from public.catalog_items i
      join lateral (
        select p.status from public.catalog_prices p where p.item_id = i.id
        order by p.created_at desc, p.id desc limit 1
      ) latest on latest.status <> 'withdrawn'
      where i.active and i.image_path = object_path
    )
  )
$$;
revoke all on function private.can_read_catalog_image(text) from public, anon;
grant execute on function private.can_read_catalog_image(text) to authenticated;

create policy catalog_images_read on storage.objects for select to authenticated
  using (bucket_id = 'catalog-images' and private.can_read_catalog_image(name));
create policy catalog_images_insert on storage.objects for insert to authenticated
  with check (
    bucket_id = 'catalog-images' and private.has_permission('system.manage')
    and owner_id = (select auth.uid())::text
    and name ~ ('^items/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/'
      || (select auth.uid())::text
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$')
  );
-- No UPDATE or DELETE policies: replacing an image changes the reference to a
-- new object. Old files remain available for audit and cannot be overwritten.

create function public.catalog_image_path(item_uuid uuid)
returns text language plpgsql stable security definer set search_path = '' as $$
declare result text;
begin
  if not (private.has_permission('system.manage') or private.has_permission('request.create')) then
    raise exception 'ไม่มีสิทธิ์อ่านรูปภาพแค็ตตาล็อก' using errcode = '42501';
  end if;
  select i.image_path into result from public.catalog_items i
    where i.id = item_uuid and private.can_read_catalog_image(i.image_path);
  return result;
end;
$$;
revoke all on function public.catalog_image_path(uuid) from public, anon;
grant execute on function public.catalog_image_path(uuid) to authenticated;

create function public.save_procurement_catalog_item(payload jsonb)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  target_id uuid;
  expected integer;
  old_item public.catalog_items%rowtype;
  saved_item public.catalog_items%rowtype;
  exists_already boolean;
  field text;
  price jsonb;
  amount numeric;
  price_date date;
  expiry_date date;
  next_image text;
  image_type text;
  new_price_id uuid;
begin
  if actor is null or not private.has_permission('system.manage') then
    raise exception 'เฉพาะผู้ดูแลระบบที่เปิดใช้งานเท่านั้นที่แก้ไขแค็ตตาล็อกได้' using errcode = '42501';
  end if;
  if payload is null or jsonb_typeof(payload) <> 'object'
    or not (payload ?& array['item_id','expected_version','item_code','category_code','subcategory',
      'name','specification','unit','notes','active','image_path','price'])
    or exists (select 1 from jsonb_object_keys(payload) k where k <> all(array[
      'item_id','expected_version','item_code','category_code','subcategory','name',
      'specification','unit','notes','active','image_path','price'])) then
    raise exception 'ข้อมูลแค็ตตาล็อกไม่ครบตามโครงสร้าง' using errcode = '22023';
  end if;
  foreach field in array array['item_id','item_code','category_code','subcategory','name','specification','unit','notes'] loop
    if jsonb_typeof(payload -> field) <> 'string' then
      raise exception 'ชนิดข้อมูลแค็ตตาล็อกไม่ถูกต้อง' using errcode = '22023';
    end if;
  end loop;
  if (payload ->> 'item_id') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    or char_length(btrim(payload ->> 'item_code')) not between 1 and 100
    or btrim(payload ->> 'item_code') !~ '^[A-Za-z0-9][A-Za-z0-9._/-]*$'
    or char_length(btrim(payload ->> 'category_code')) not between 1 and 30
    or char_length(btrim(payload ->> 'subcategory')) > 100
    or char_length(btrim(payload ->> 'name')) not between 1 and 300
    or char_length(btrim(payload ->> 'specification')) > 1000
    or char_length(btrim(payload ->> 'unit')) not between 1 and 100
    or char_length(btrim(payload ->> 'notes')) > 2000
    or jsonb_typeof(payload -> 'active') <> 'boolean'
    or jsonb_typeof(payload -> 'image_path') not in ('string', 'null') then
    raise exception 'กรุณาตรวจรหัส ชื่อ หน่วยนับ และรายละเอียดรายการ' using errcode = '22023';
  end if;
  target_id := (payload ->> 'item_id')::uuid;
  if payload -> 'expected_version' <> 'null'::jsonb then
    if jsonb_typeof(payload -> 'expected_version') <> 'number'
      or (payload ->> 'expected_version') !~ '^[1-9][0-9]{0,9}$'
      or (payload ->> 'expected_version')::numeric > 2147483646 then
      raise exception 'รุ่นข้อมูลไม่ถูกต้อง กรุณาโหลดข้อมูลใหม่' using errcode = '22023';
    end if;
    expected := (payload ->> 'expected_version')::integer;
  end if;
  next_image := payload ->> 'image_path';
  price := payload -> 'price';
  if price <> 'null'::jsonb then
    if jsonb_typeof(price) <> 'object'
      or not (price ?& array['reference_price','source_name','reference_date','valid_until'])
      or exists (select 1 from jsonb_object_keys(price) k where k <> all(array[
        'reference_price','source_name','reference_date','valid_until'])) then
      raise exception 'ข้อมูลราคาอ้างอิงไม่ครบตามโครงสร้าง' using errcode = '22023';
    end if;
    if jsonb_typeof(price -> 'reference_price') <> 'number'
      or jsonb_typeof(price -> 'source_name') <> 'string'
      or char_length(btrim(price ->> 'source_name')) not between 1 and 300 then
      raise exception 'กรุณาตรวจราคาและแหล่งที่มาของราคา' using errcode = '22023';
    end if;
    amount := (price ->> 'reference_price')::numeric;
    if amount < 0 or amount > 999999999999.99 or amount <> round(amount, 2) then
      raise exception 'ราคาอ้างอิงต้องเป็นจำนวนไม่ติดลบและมีทศนิยมไม่เกิน 2 ตำแหน่ง' using errcode = '22023';
    end if;
    foreach field in array array['reference_date','valid_until'] loop
      if jsonb_typeof(price -> field) not in ('string', 'null')
        or (price -> field <> 'null'::jsonb and (price ->> field) !~ '^\d{4}-\d{2}-\d{2}$') then
        raise exception 'วันที่อ้างอิงไม่ถูกต้อง' using errcode = '22023';
      end if;
    end loop;
    price_date := (price ->> 'reference_date')::date;
    expiry_date := (price ->> 'valid_until')::date;
    if price_date is null and expiry_date is not null then
      raise exception 'กรุณาระบุวันที่อ้างอิงก่อนกำหนดวันหมดอายุ' using errcode = '22023';
    end if;
    if price_date is not null and expiry_date < price_date then
      raise exception 'วันหมดอายุต้องไม่อยู่ก่อนวันที่อ้างอิง' using errcode = '22023';
    end if;
  end if;

  select * into old_item from public.catalog_items where id = target_id for update;
  exists_already := found;
  if (exists_already and (expected is null or old_item.version <> expected))
    or (not exists_already and expected is not null) then
    raise exception 'มีการแก้ไขข้อมูลระหว่างนี้ กรุณาโหลดรายการใหม่ก่อนบันทึก' using errcode = '40001';
  end if;
  if price = 'null'::jsonb and (not exists_already
    or old_item.name is distinct from btrim(payload ->> 'name')
    or old_item.specification is distinct from btrim(payload ->> 'specification')
    or old_item.unit is distinct from btrim(payload ->> 'unit')) then
    raise exception 'รายการใหม่หรือการเปลี่ยนชื่อ คุณลักษณะ หรือหน่วยนับ ต้องระบุราคาอ้างอิงใหม่' using errcode = '22023';
  end if;

  if next_image is not null and (not exists_already or next_image is distinct from old_item.image_path) then
    if next_image !~ ('^items/' || target_id::text || '/' || actor::text
      || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$') then
      raise exception 'รูปภาพต้องเป็นไฟล์ที่อัปโหลดสำหรับรายการนี้โดยผู้บันทึก' using errcode = '22023';
    end if;
    image_type := case
      when next_image like '%.jpg' then 'image/jpeg'
      when next_image like '%.png' then 'image/png'
      when next_image like '%.webp' then 'image/webp'
    end;
    if not exists (select 1 from storage.objects o
      where o.bucket_id = 'catalog-images' and o.name = next_image and o.owner_id = actor::text
        and o.metadata ->> 'mimetype' = image_type
        and (o.metadata ->> 'size')::bigint between 1 and 2097152) then
      raise exception 'ไม่พบรูปภาพที่อัปโหลดสำเร็จ หรือชนิด/ขนาดไฟล์ไม่ถูกต้อง' using errcode = '22023';
    end if;
  end if;

  if exists_already then
    update public.catalog_items set
      item_code = btrim(payload ->> 'item_code'), category_code = btrim(payload ->> 'category_code'),
      subcategory = btrim(payload ->> 'subcategory'), name = btrim(payload ->> 'name'),
      specification = btrim(payload ->> 'specification'), unit = btrim(payload ->> 'unit'),
      notes = btrim(payload ->> 'notes'), active = (payload ->> 'active')::boolean,
      image_path = next_image, version = version + 1, updated_at = clock_timestamp(), updated_by = actor
      where id = target_id returning * into saved_item;
  else
    insert into public.catalog_items(id,item_code,category_code,subcategory,name,specification,unit,
      notes,active,image_path,updated_by)
    values (target_id,btrim(payload ->> 'item_code'),btrim(payload ->> 'category_code'),
      btrim(payload ->> 'subcategory'),btrim(payload ->> 'name'),btrim(payload ->> 'specification'),
      btrim(payload ->> 'unit'),btrim(payload ->> 'notes'),(payload ->> 'active')::boolean,next_image,actor)
    returning * into saved_item;
  end if;

  if price <> 'null'::jsonb then
    insert into public.catalog_prices(item_id,origin,created_by,reference_price,source_name,
      reference_date,valid_until,status,created_at)
    values (target_id,'manual',actor,amount,btrim(price ->> 'source_name'),price_date,expiry_date,
      'unverified',greatest(clock_timestamp(),coalesce(
        (select max(p.created_at) + interval '1 microsecond' from public.catalog_prices p where p.item_id = target_id),
        '-infinity'::timestamptz))) returning id into new_price_id;
  end if;
  insert into public.catalog_item_revisions(item_id,version,actor_id,before_state,after_state,price_id)
  values (target_id,saved_item.version,actor,case when exists_already then to_jsonb(old_item) else null end,
    to_jsonb(saved_item),new_price_id);
  return jsonb_build_object('item_id',target_id,'version',saved_item.version);
end;
$$;
revoke all on function public.save_procurement_catalog_item(jsonb) from public, anon;
grant execute on function public.save_procurement_catalog_item(jsonb) to authenticated;

-- One query implementation powers both the existing request picker and the
-- management screen. This private helper has no client execution grant.
create function private.procurement_catalog_data(catalog_query text, category_filter text,
  page_number integer, include_inactive boolean)
returns jsonb language sql stable security definer set search_path = '' as $$
  with entries as (
    select i.id as item_id,i.item_code,i.category_code,c.name as category_name,
      i.subcategory,i.name,i.specification,i.unit,i.notes,i.version,i.active,i.image_path,
      p.id as price_id,p.reference_price,p.source_name,p.reference_date,p.valid_until,
      p.status,p.origin,p.import_id,p.sheet_name,p.row_number,b.file_name,
      (p.valid_until is not null and p.valid_until < (now() at time zone 'Asia/Bangkok')::date) as expired
    from public.catalog_items i
    join public.catalog_categories c on c.code = i.category_code
    join lateral (
      select cp.* from public.catalog_prices cp where cp.item_id = i.id
      order by cp.created_at desc,cp.id desc limit 1
    ) p on (include_inactive or p.status <> 'withdrawn')
    left join public.catalog_imports b on b.id = p.import_id
    where include_inactive or i.active
  ), filtered as (
    select * from entries e where (category_filter = '' or e.category_code = category_filter)
      and position(lower(btrim(catalog_query)) in lower(concat_ws(' ',e.item_code,e.name,
        e.specification,e.category_name,e.subcategory))) > 0
  ), paged as (
    select * from filtered order by item_code limit 20 offset page_number * 20
  ) select jsonb_build_object(
    'items',coalesce((select jsonb_agg(to_jsonb(p) order by p.item_code) from paged p),'[]'::jsonb),
    'total',(select count(*) from filtered),
    'categories',coalesce((select jsonb_agg(to_jsonb(c) order by c.code) from public.catalog_categories c),'[]'::jsonb)
  )
$$;
revoke all on function private.procurement_catalog_data(text,text,integer,boolean) from public, anon, authenticated;

create or replace function public.search_procurement_catalog(
  catalog_query text default '', category_filter text default '', page_number integer default 0
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_permission('request.create') then
    raise exception 'ไม่มีสิทธิ์อ่านแค็ตตาล็อก' using errcode = '42501';
  end if;
  if catalog_query is null or char_length(catalog_query) > 120
    or category_filter is null or char_length(category_filter) > 30
    or page_number is null or page_number < 0 or page_number > 10000 then
    raise exception 'เงื่อนไขค้นหาไม่ถูกต้อง' using errcode = '22023';
  end if;
  return private.procurement_catalog_data(catalog_query,category_filter,page_number,false);
end;
$$;
revoke all on function public.search_procurement_catalog(text,text,integer) from public, anon;
grant execute on function public.search_procurement_catalog(text,text,integer) to authenticated;

create function public.search_procurement_catalog_admin(
  catalog_query text default '', category_filter text default '', page_number integer default 0
) returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.has_permission('system.manage') then
    raise exception 'เฉพาะผู้ดูแลระบบเท่านั้นที่จัดการแค็ตตาล็อกได้' using errcode = '42501';
  end if;
  if catalog_query is null or char_length(catalog_query) > 120
    or category_filter is null or char_length(category_filter) > 30
    or page_number is null or page_number < 0 or page_number > 10000 then
    raise exception 'เงื่อนไขค้นหาไม่ถูกต้อง' using errcode = '22023';
  end if;
  return private.procurement_catalog_data(catalog_query,category_filter,page_number,true);
end;
$$;
revoke all on function public.search_procurement_catalog_admin(text,text,integer) from public, anon;
grant execute on function public.search_procurement_catalog_admin(text,text,integer) to authenticated;

comment on table public.catalog_item_revisions is 'Append-only administrator change audit. Old images and workbook provenance are retained.';
comment on column public.catalog_items.image_path is 'Current object in private catalog-images bucket. image_reference retains the original Excel locator.';
comment on table public.catalog_prices is 'Append-only reference-price revisions. Manual maintenance is unverified; import dates are not price reference dates.';

commit;
