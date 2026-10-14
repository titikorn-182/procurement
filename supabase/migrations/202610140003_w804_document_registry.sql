-- One centrally numbered, editable document set; no approval workflow.
begin;

create sequence if not exists public.w804_request_no_seq;
revoke all on sequence public.w804_request_no_seq from public, anon, authenticated;

create or replace function private.next_w804_request_no() returns text
language plpgsql security definer set search_path = '' as $$
declare n text;
begin
  n := nextval('public.w804_request_no_seq')::text;
  return 'W804-' || lpad(n, greatest(3, length(n)), '0');
end;
$$;
revoke all on function private.next_w804_request_no() from public, anon, authenticated;

create table if not exists public.w804_document_sets (
  id uuid primary key,
  request_no text not null unique default private.next_w804_request_no()
    check (request_no ~ '^W804-[0-9]{3,}$'),
  requester_id uuid not null references public.profiles(id) on delete restrict,
  title text not null check (length(btrim(title)) between 1 and 500),
  fiscal_year text not null check (fiscal_year ~ '^25[0-9]{2}$'),
  total_amount numeric(12,2) not null check (total_amount between 0 and 50000),
  form_data jsonb not null check (jsonb_typeof(form_data) = 'object'),
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  search_text text generated always as (request_no || ' ' || title) stored
);
create index if not exists w804_owner_created_idx
  on public.w804_document_sets(requester_id, created_at desc, id desc);
create index if not exists w804_created_idx
  on public.w804_document_sets(created_at desc, id desc);

create or replace function private.can_read_w804(owner_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p where p.id = auth.uid() and p.active
    and (p.role = 'admin' or (p.role = 'user' and p.id = owner_id)));
$$;
revoke all on function private.can_read_w804(uuid) from public, anon;
grant execute on function private.can_read_w804(uuid) to authenticated;
alter table public.w804_document_sets enable row level security;
revoke all on public.w804_document_sets from public, anon, authenticated;
grant select on public.w804_document_sets to authenticated;
drop policy if exists w804_read on public.w804_document_sets;
create policy w804_read on public.w804_document_sets for select to authenticated
  using (private.can_read_w804(requester_id));

-- All writes go through this RPC. A stable client UUID makes a lost-response retry
-- idempotent, while a revision prevents silent last-writer-wins data loss.
create or replace function public.save_w804_document_set(
  record_id uuid, expected_revision integer, draft_data jsonb
) returns table(id uuid, request_no text, revision integer)
language plpgsql security definer set search_path = '' as $$
declare
  actor uuid := auth.uid();
  actor_role public.app_role;
  existing public.w804_document_sets%rowtype;
  saved public.w804_document_sets%rowtype;
  item jsonb;
  amount numeric := 0;
begin
  select p.role into actor_role from public.profiles p
    where p.id = actor and p.active and p.role in ('user', 'admin');
  if actor_role is null then raise exception 'Not authorized' using errcode = '42501'; end if;
  if record_id is null or expected_revision is null or expected_revision < 0
    or expected_revision > 2147483646
    or jsonb_typeof(draft_data) is distinct from 'object'
    or octet_length(draft_data::text) > 260000
    or draft_data->>'format' is distinct from 'ubu-pol-w804'
    or draft_data->'version' is distinct from '1'::jsonb
    or jsonb_typeof(draft_data->'title') is distinct from 'string'
    or length(btrim(draft_data->>'title')) not between 1 and 500
    or coalesce(draft_data#>>'{budget,fiscalYear}', '') !~ '^25[0-9]{2}$'
    or jsonb_typeof(draft_data->'items') is distinct from 'array'
  then raise exception 'Invalid W804 draft' using errcode = '22023'; end if;
  if jsonb_array_length(draft_data->'items') > 100 then
    raise exception 'Too many items' using errcode = '22023';
  end if;
  for item in select value from jsonb_array_elements(draft_data->'items') loop
    if jsonb_typeof(item->'quantity') is distinct from 'number'
      or jsonb_typeof(item->'unitPrice') is distinct from 'number' then
      raise exception 'Invalid amount' using errcode = '22023';
    end if;
    if (item->>'quantity')::numeric not between 0 and 1000000
      or (item->>'unitPrice')::numeric not between 0 and 1000000
      or round((item->>'quantity')::numeric, 2) <> (item->>'quantity')::numeric
      or round((item->>'unitPrice')::numeric, 2) <> (item->>'unitPrice')::numeric then
      raise exception 'Invalid amount' using errcode = '22023';
    end if;
    amount := amount + round((item->>'quantity')::numeric * (item->>'unitPrice')::numeric, 2);
  end loop;
  if amount > 50000 then raise exception 'W804 amount exceeds limit' using errcode = '22023'; end if;

  perform pg_advisory_xact_lock(hashtextextended(record_id::text, 804));
  select * into existing from public.w804_document_sets d where d.id = record_id for update;
  if found then
    if existing.requester_id <> actor and actor_role <> 'admin' then
      raise exception 'Not authorized' using errcode = '42501';
    end if;
    if existing.revision = expected_revision + 1 and existing.form_data = draft_data then
      return query select existing.id, existing.request_no, existing.revision;
      return;
    end if;
    if existing.revision <> expected_revision then
      raise exception 'Draft revision changed' using errcode = '40001';
    end if;
    update public.w804_document_sets d set
      title = btrim(draft_data->>'title'), fiscal_year = draft_data#>>'{budget,fiscalYear}',
      total_amount = amount, form_data = draft_data, revision = d.revision + 1, updated_at = now()
      where d.id = record_id returning d.* into saved;
  else
    if expected_revision <> 0 then
      raise exception 'Draft revision changed' using errcode = '40001';
    end if;
    insert into public.w804_document_sets(id, requester_id, title, fiscal_year, total_amount, form_data)
      values(record_id, actor, btrim(draft_data->>'title'), draft_data#>>'{budget,fiscalYear}', amount, draft_data)
      returning * into saved;
  end if;
  return query select saved.id, saved.request_no, saved.revision;
end;
$$;
revoke all on function public.save_w804_document_set(uuid, integer, jsonb) from public, anon;
grant execute on function public.save_w804_document_set(uuid, integer, jsonb) to authenticated;
notify pgrst, 'reload schema';
commit;
