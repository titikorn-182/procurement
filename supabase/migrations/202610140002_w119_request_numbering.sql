-- Activation stage: deploy alias-aware detail/edit/print routes BEFORE running.
-- Retains request UUIDs, official documentNo, attachments, actions and payment FKs.
begin;
lock table public.procurement_requests in share row exclusive mode;

create sequence if not exists public.w119_request_no_seq start with 1;
revoke all on sequence public.w119_request_no_seq from public, anon, authenticated;

create or replace function private.next_w119_request_no()
returns text language plpgsql security definer set search_path = '' as $$
declare value text;
begin
  value := nextval('public.w119_request_no_seq')::text;
  return 'W119-' || lpad(value, greatest(3, length(value)), '0');
end;
$$;
-- Preserve the POL01 counter, including numbers consumed before this migration.
-- Unlike fixed-width lpad, this also supports 1000 and above without truncation.
create or replace function private.next_pol01_request_no()
returns text language plpgsql security definer set search_path = '' as $$
declare value text;
begin
  value := nextval('public.pol01_request_no_seq')::text;
  return 'POL01-' || lpad(value, greatest(3, length(value)), '0');
end;
$$;
revoke all on function private.next_w119_request_no() from public, anon, authenticated;
revoke all on function private.next_pol01_request_no() from public, anon, authenticated;

do $$
declare
  max_number bigint;
  next_number bigint;
  old_request record;
begin
  -- Do not rewind on reruns, after deletions, or after sequence gaps/failed inserts.
  select coalesce(max(substring(n from '^W119-([0-9]+)$')::bigint), 0)
    into max_number from (
      select request_no as n from public.procurement_requests
      union all select old_request_no from public.request_number_aliases
    ) numbers where n ~ '^W119-[0-9]+$';
  select last_value + case when is_called then 1 else 0 end into next_number
    from public.w119_request_no_seq;
  perform setval('public.w119_request_no_seq', greatest(max_number + 1, next_number), false);

  for old_request in
    select id, request_no from public.procurement_requests
    where form_data->>'formType' = 'w119' and request_no !~ '^W119-[0-9]+$'
    order by created_at, id
  loop
    insert into public.request_number_aliases(old_request_no, request_id, reason)
      values (old_request.request_no, old_request.id, 'Separate W119 numbering (202610140002)');
    update public.procurement_requests set request_no = private.next_w119_request_no()
      where id = old_request.id;
  end loop;
end;
$$;

-- A column default cannot inspect form_data. Dispatch at insertion so the
-- existing create-draft RPC returns the assigned number in the same transaction.
alter table public.procurement_requests alter column request_no drop default;
create or replace function private.assign_procurement_request_number()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.request_no is null or btrim(new.request_no) = '' then
    loop
      new.request_no := case when new.form_data->>'formType' = 'w119'
        then private.next_w119_request_no() else private.next_pol01_request_no() end;
      exit when not exists (select 1 from public.procurement_requests r where r.request_no = new.request_no)
        and not exists (select 1 from public.request_number_aliases a where a.old_request_no = new.request_no);
    end loop;
  elsif exists (select 1 from public.request_number_aliases a where a.old_request_no = new.request_no) then
    raise exception 'request number is reserved by historical reference';
  end if;
  return new;
end;
$$;
revoke all on function private.assign_procurement_request_number() from public, anon, authenticated;
drop trigger if exists assign_procurement_request_number on public.procurement_requests;
create trigger assign_procurement_request_number before insert on public.procurement_requests
  for each row execute function private.assign_procurement_request_number();

notify pgrst, 'reload schema';
commit;
