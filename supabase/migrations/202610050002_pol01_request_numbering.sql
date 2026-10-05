begin;

create sequence if not exists public.pol01_request_no_seq start with 1;

create or replace function private.next_pol01_request_no()
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  next_value bigint;
begin
  next_value := nextval('public.pol01_request_no_seq');
  return 'POL01-' || lpad(next_value::text, 3, '0');
end;
$$;

-- Preserve UUID relationships while assigning the requested human-readable
-- POL-01 numbers to existing requests in their original creation order.
do $$
declare
  request_record record;
  current_max bigint;
begin
  select max(substring(request_no from '^POL01-([0-9]+)$')::bigint)
  into current_max
  from public.procurement_requests
  where request_no ~ '^POL01-[0-9]+$';

  perform setval(
    'public.pol01_request_no_seq',
    greatest(coalesce(current_max, 0) + 1, 1),
    false
  );

  for request_record in
    select id
    from public.procurement_requests
    where request_no !~ '^POL01-[0-9]+$'
    order by created_at, id
  loop
    update public.procurement_requests
    set request_no = private.next_pol01_request_no()
    where id = request_record.id;
  end loop;

  select max(substring(request_no from '^POL01-([0-9]+)$')::bigint)
  into current_max
  from public.procurement_requests
  where request_no ~ '^POL01-[0-9]+$';

  perform setval(
    'public.pol01_request_no_seq',
    greatest(coalesce(current_max, 1), 1),
    current_max is not null
  );
end;
$$;

alter table public.procurement_requests
alter column request_no set default private.next_pol01_request_no();

revoke all on function private.next_pol01_request_no() from public;

commit;
