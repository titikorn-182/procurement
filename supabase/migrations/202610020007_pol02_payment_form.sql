begin;

alter table public.payment_requests
  add column if not exists form_data jsonb not null default '{}'::jsonb;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payment_requests_form_data_object'
      and conrelid = 'public.payment_requests'::regclass
  ) then
    alter table public.payment_requests
      add constraint payment_requests_form_data_object
      check (jsonb_typeof(form_data) = 'object' and pg_column_size(form_data) <= 50000)
      not valid;
  end if;
end;
$$;

create table if not exists public.payment_items (
  id uuid primary key default gen_random_uuid(),
  payment_request_id uuid not null references public.payment_requests(id) on delete cascade,
  line_no integer not null check (line_no between 1 and 100),
  description text not null check (char_length(trim(description)) between 1 and 500),
  attachment_type text not null check (char_length(trim(attachment_type)) between 1 and 100),
  document_no text check (char_length(trim(document_no)) <= 100),
  quantity numeric(12,2) not null check (quantity > 0),
  unit_price numeric(14,2) not null check (unit_price >= 0),
  total_amount numeric(14,2) generated always as (quantity * unit_price) stored,
  unique (payment_request_id, line_no)
);

create index if not exists payment_items_payment_request_idx
  on public.payment_items(payment_request_id, line_no);

alter table public.payment_items enable row level security;
drop policy if exists payment_items_read on public.payment_items;
create policy payment_items_read on public.payment_items for select to authenticated
using (private.can_read_payment(payment_request_id));
revoke all on public.payment_items from public, anon, authenticated;
grant select on public.payment_items to authenticated;

create or replace function public.protect_payment_workflow_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_owner_draft_submission boolean;
begin
  is_owner_draft_submission := coalesce(
    old.requester_id = (select auth.uid())
    and new.requester_id = old.requester_id
    and new.procurement_request_id = old.procurement_request_id
    and old.status = 'draft'
    and new.status = 'submitted'
    and old.current_step = 1
    and new.submitted_at is not null
    and exists (
      select 1
      from private.payment_workflow_steps step
      where step.step_no = new.current_step
        and step.step_no = (
          select min(first_step.step_no) from private.payment_workflow_steps first_step
        )
    ),
    false
  );

  if not private.is_privileged()
    and not is_owner_draft_submission
    and (
      new.requester_id is distinct from old.requester_id
      or new.procurement_request_id is distinct from old.procurement_request_id
      or new.status is distinct from old.status
      or new.current_step is distinct from old.current_step
      or new.submitted_at is distinct from old.submitted_at
    ) then
    raise exception 'workflow fields may only be changed by authorized staff';
  end if;

  return new;
end;
$$;

create or replace function public.create_payment_request_draft(
  source_request_id uuid,
  payment_idempotency_key uuid,
  payment_invoice_no text,
  payment_invoice_date date,
  payment_subtotal numeric,
  payment_vat_amount numeric,
  payment_delivery_detail text,
  payment_form_data jsonb,
  payment_items jsonb
)
returns table(id uuid, payment_no text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile public.profiles%rowtype;
  source_request public.procurement_requests%rowtype;
  existing_payment public.payment_requests%rowtype;
  new_payment public.payment_requests%rowtype;
  item jsonb;
  item_count integer;
  item_total numeric(14,2) := 0;
  item_quantity numeric;
  item_unit_price numeric;
  line_number integer;
  already_requested numeric(14,2);
  existing_items jsonb;
begin
  select * into current_profile
  from public.profiles
  where profiles.id = (select auth.uid()) and profiles.active = true;
  if current_profile.id is null then raise exception 'active profile required'; end if;
  if not private.has_permission('payment.create') then
    raise exception 'payment creation permission required';
  end if;

  if payment_idempotency_key is null then raise exception 'idempotency key is required'; end if;
  if char_length(trim(coalesce(payment_invoice_no, ''))) not between 1 and 100
    or char_length(trim(coalesce(payment_delivery_detail, ''))) not between 1 and 2000 then
    raise exception 'invalid payment description';
  end if;
  if payment_invoice_date is null or payment_invoice_date > current_date then
    raise exception 'invalid invoice date';
  end if;
  if payment_subtotal is null or payment_vat_amount is null
    or payment_subtotal < 0 or payment_vat_amount < 0
    or payment_subtotal + payment_vat_amount <= 0
    or payment_subtotal + payment_vat_amount > 999999999999.99 then
    raise exception 'invalid payment amount';
  end if;

  if payment_form_data is null
    or jsonb_typeof(payment_form_data) <> 'object'
    or pg_column_size(payment_form_data) > 50000
    or payment_form_data->>'formType' <> 'pol02'
    or payment_form_data->>'formVersion' <> '1' then
    raise exception 'invalid POL02 form contract';
  end if;
  if char_length(trim(coalesce(payment_form_data->>'departmentName', ''))) not between 1 and 300
    or char_length(trim(coalesce(payment_form_data->>'requesterName', ''))) not between 1 and 300
    or char_length(trim(coalesce(payment_form_data->>'subject', ''))) not between 1 and 500
    or char_length(trim(coalesce(payment_form_data->>'projectActivity', ''))) > 300
    or char_length(trim(coalesce(payment_form_data->>'fundSource', ''))) not between 1 and 200
    or char_length(trim(coalesce(payment_form_data->>'departmentCode', ''))) > 50
    or char_length(trim(coalesce(payment_form_data->>'fundCode', ''))) > 50
    or char_length(trim(coalesce(payment_form_data->>'activityCode', ''))) > 50
    or char_length(trim(coalesce(payment_form_data->>'expenseCategory', ''))) > 200
    or char_length(trim(coalesce(payment_form_data->>'procurementMethod', ''))) not between 1 and 200
    or char_length(trim(coalesce(payment_form_data->>'egpProjectNo', ''))) > 100
    or char_length(trim(coalesce(payment_form_data->>'contractNo', ''))) > 100
    or char_length(trim(coalesce(payment_form_data->>'vendorName', ''))) not between 1 and 300
    or char_length(trim(coalesce(payment_form_data->>'vendorTaxId', ''))) > 20 then
    raise exception 'required POL02 detail is missing';
  end if;
  if coalesce(payment_form_data->>'approvalDate', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
    or coalesce(payment_form_data->>'budgetYear', '') !~ '^[0-9]{4}$'
    or coalesce(payment_form_data->>'contractAmount', '') !~ '^[0-9]+(\.[0-9]+)?$'
    or coalesce(payment_form_data->>'installmentNumber', '') !~ '^[0-9]+$'
    or coalesce(payment_form_data->>'installmentCount', '') !~ '^[0-9]+$' then
    raise exception 'invalid POL02 dates or installment detail';
  end if;
  if coalesce(payment_form_data->>'contractDate', '') <> ''
    and coalesce(payment_form_data->>'contractDate', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'invalid POL02 contract date';
  end if;
  if (payment_form_data->>'approvalDate')::date > current_date
    or (payment_form_data->>'budgetYear')::integer not between 2500 and 2700
    or (payment_form_data->>'contractAmount')::numeric < payment_subtotal + payment_vat_amount
    or (payment_form_data->>'contractAmount')::numeric > 999999999999.99
    or (payment_form_data->>'installmentNumber')::integer < 1
    or (payment_form_data->>'installmentCount')::integer > 999
    or (payment_form_data->>'installmentNumber')::integer > (payment_form_data->>'installmentCount')::integer then
    raise exception 'invalid POL02 dates or installment detail';
  end if;
  if coalesce(payment_form_data->>'contractDate', '') <> ''
    and (payment_form_data->>'contractDate')::date > current_date then
    raise exception 'invalid POL02 contract date';
  end if;
  if jsonb_typeof(payment_form_data->'documentChecklist') <> 'array'
    or jsonb_array_length(payment_form_data->'documentChecklist') < 1
    or jsonb_array_length(payment_form_data->'documentChecklist') > 20 then
    raise exception 'POL02 document checklist is required';
  end if;
  if exists (
    select 1
    from jsonb_array_elements(payment_form_data->'documentChecklist') as selected(value)
    where jsonb_typeof(selected.value) <> 'string'
      or selected.value #>> '{}' not in (
        'purchase_request', 'procurement_approval', 'contract', 'delivery_invoice',
        'inspection', 'asset_register', 'payment_evidence', 'other'
      )
  ) then
    raise exception 'invalid POL02 document checklist';
  end if;

  if payment_items is null or jsonb_typeof(payment_items) <> 'array' then
    raise exception 'payment items must be an array';
  end if;
  item_count := jsonb_array_length(payment_items);
  if item_count < 1 or item_count > 100 then raise exception 'payment items required'; end if;

  for item in select value from jsonb_array_elements(payment_items)
  loop
    if jsonb_typeof(item) <> 'object'
      or coalesce(item->>'lineNo', '') !~ '^[0-9]+$'
      or coalesce(item->>'quantity', '') !~ '^[0-9]+(\.[0-9]+)?$'
      or coalesce(item->>'unitPrice', '') !~ '^[0-9]+(\.[0-9]+)?$' then
      raise exception 'invalid payment item';
    end if;
    line_number := (item->>'lineNo')::integer;
    item_quantity := (item->>'quantity')::numeric;
    item_unit_price := (item->>'unitPrice')::numeric;
    if line_number not between 1 and 100
      or char_length(trim(coalesce(item->>'description', ''))) not between 1 and 500
      or char_length(trim(coalesce(item->>'attachmentType', ''))) not between 1 and 100
      or char_length(trim(coalesce(item->>'documentNo', ''))) > 100
      or item_quantity <= 0 or item_quantity > 999999999
      or item_unit_price < 0 or item_unit_price > 999999999999.99
      or round(item_quantity * item_unit_price, 2) > 999999999999.99 then
      raise exception 'invalid payment item values';
    end if;
    item_total := item_total + round(item_quantity * item_unit_price, 2);
  end loop;
  if item_total <> round(payment_subtotal, 2) then
    raise exception 'payment item total does not match subtotal';
  end if;

  select * into source_request
  from public.procurement_requests
  where procurement_requests.id = source_request_id
  for update;
  if source_request.id is null then raise exception 'source request not found'; end if;
  if source_request.requester_id <> current_profile.id
    and not private.has_permission('payment.transition_all') then
    raise exception 'payment creation is limited to the request owner';
  end if;
  if source_request.status not in ('approved', 'ordered', 'completed') then
    raise exception 'source request is not payable';
  end if;

  select * into existing_payment
  from public.payment_requests
  where requester_id = current_profile.id
    and idempotency_key = payment_idempotency_key;
  if existing_payment.id is not null then
    select coalesce(
      jsonb_agg(
        jsonb_build_object(
          'lineNo', line_no,
          'description', description,
          'attachmentType', attachment_type,
          'documentNo', coalesce(document_no, ''),
          'quantity', quantity,
          'unitPrice', unit_price
        ) order by line_no
      ),
      '[]'::jsonb
    ) into existing_items
    from public.payment_items
    where payment_request_id = existing_payment.id;

    if existing_payment.status <> 'draft'
      or existing_payment.procurement_request_id <> source_request.id
      or existing_payment.invoice_no <> trim(payment_invoice_no)
      or existing_payment.invoice_date <> payment_invoice_date
      or existing_payment.subtotal <> round(payment_subtotal, 2)
      or existing_payment.vat_amount <> round(payment_vat_amount, 2)
      or existing_payment.delivery_detail <> trim(payment_delivery_detail)
      or existing_payment.form_data <> payment_form_data
      or existing_items <> payment_items then
      raise exception 'idempotency key was reused with different payment data';
    end if;
    return query select existing_payment.id, existing_payment.payment_no;
    return;
  end if;

  select coalesce(sum(total_amount), 0) into already_requested
  from public.payment_requests
  where procurement_request_id = source_request.id
    and status not in ('cancelled', 'draft');
  if already_requested + payment_subtotal + payment_vat_amount > source_request.estimated_amount then
    raise exception 'payment amount exceeds remaining request amount';
  end if;

  insert into public.payment_requests (
    procurement_request_id, requester_id, idempotency_key, invoice_no, invoice_date,
    subtotal, vat_amount, delivery_detail, form_data, status, current_step, submitted_at
  ) values (
    source_request.id, current_profile.id, payment_idempotency_key, trim(payment_invoice_no),
    payment_invoice_date, round(payment_subtotal, 2), round(payment_vat_amount, 2),
    trim(payment_delivery_detail), payment_form_data, 'draft', 1, null
  ) returning * into new_payment;

  insert into public.payment_items (
    payment_request_id, line_no, description, attachment_type, document_no, quantity, unit_price
  )
  select
    new_payment.id,
    (value->>'lineNo')::integer,
    trim(value->>'description'),
    trim(value->>'attachmentType'),
    nullif(trim(value->>'documentNo'), ''),
    (value->>'quantity')::numeric,
    (value->>'unitPrice')::numeric
  from jsonb_array_elements(payment_items);

  return query select new_payment.id, new_payment.payment_no;
end;
$$;

create or replace function public.submit_payment_request_draft(target_payment_id uuid)
returns table(id uuid, payment_no text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile public.profiles%rowtype;
  current_payment public.payment_requests%rowtype;
  source_request public.procurement_requests%rowtype;
  first_step private.payment_workflow_steps%rowtype;
  already_requested numeric(14,2);
  attachment_count integer;
  item_total numeric(14,2);
begin
  select * into current_profile
  from public.profiles
  where profiles.id = (select auth.uid()) and profiles.active = true;
  if current_profile.id is null then raise exception 'active profile required'; end if;
  if not private.has_permission('payment.create') then
    raise exception 'payment creation permission required';
  end if;

  select * into current_payment
  from public.payment_requests
  where payment_requests.id = target_payment_id
  for update;
  if current_payment.id is null then raise exception 'payment draft not found'; end if;
  if current_payment.requester_id <> current_profile.id then raise exception 'payment owner required'; end if;
  if current_payment.status <> 'draft' then raise exception 'payment is not a draft'; end if;
  if current_payment.form_data->>'formType' <> 'pol02'
    or current_payment.form_data->>'formVersion' <> '1' then
    raise exception 'invalid POL02 form contract';
  end if;

  select coalesce(sum(total_amount), 0) into item_total
  from public.payment_items
  where payment_request_id = current_payment.id;
  if item_total <> current_payment.subtotal then
    raise exception 'payment item total does not match subtotal';
  end if;

  select count(*) into attachment_count
  from public.payment_attachments a
  join storage.objects o
    on o.bucket_id = 'procurement-documents'
   and o.name = a.storage_path
  where a.payment_request_id = current_payment.id;
  if attachment_count < 1 then raise exception 'POL02 attachment is required'; end if;

  select * into source_request
  from public.procurement_requests
  where procurement_requests.id = current_payment.procurement_request_id
  for update;
  if source_request.id is null or source_request.status not in ('approved', 'ordered', 'completed') then
    raise exception 'source request is not payable';
  end if;

  select coalesce(sum(total_amount), 0) into already_requested
  from public.payment_requests
  where procurement_request_id = source_request.id
    and id <> current_payment.id
    and status not in ('cancelled', 'draft');
  if already_requested + current_payment.total_amount > source_request.estimated_amount then
    raise exception 'payment amount exceeds remaining request amount';
  end if;

  select * into first_step
  from private.payment_workflow_steps
  order by step_no
  limit 1;
  if first_step.step_no is null then raise exception 'payment workflow is not configured'; end if;

  update public.payment_requests
  set status = 'submitted', current_step = first_step.step_no, submitted_at = now(), updated_at = now()
  where payment_requests.id = current_payment.id
  returning * into current_payment;

  insert into public.payment_workflow_tasks (
    payment_request_id, step_no, step_name, required_role, due_at
  ) values (
    current_payment.id,
    first_step.step_no,
    first_step.step_name,
    first_step.required_role,
    now() + make_interval(days => first_step.due_days)
  );

  insert into public.payment_workflow_actions (
    payment_request_id, actor_id, action, comment, metadata
  ) values (
    current_payment.id,
    current_profile.id,
    'submit',
    'ยื่นคำขอเบิกจ่าย POL02 เข้าสู่กระบวนการ',
    jsonb_build_object('formType', 'pol02', 'formVersion', 1, 'attachmentCount', attachment_count)
  );

  return query select current_payment.id, current_payment.payment_no;
end;
$$;

revoke all on function public.create_payment_request_draft(
  uuid, uuid, text, date, numeric, numeric, text, jsonb, jsonb
) from public;
grant execute on function public.create_payment_request_draft(
  uuid, uuid, text, date, numeric, numeric, text, jsonb, jsonb
) to authenticated;

revoke all on function public.submit_payment_request_draft(uuid) from public;
grant execute on function public.submit_payment_request_draft(uuid) to authenticated;

commit;
