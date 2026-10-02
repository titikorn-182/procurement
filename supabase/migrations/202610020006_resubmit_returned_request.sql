begin;

create or replace function public.update_returned_procurement_request(
  target_request_id uuid,
  request_kind public.request_kind,
  request_title text,
  request_rationale text,
  request_required_date date,
  request_budget_year integer,
  request_fund_source text,
  request_plan_name text,
  request_expense_category text,
  request_form_data jsonb,
  request_items jsonb
)
returns table(id uuid, request_no text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile public.profiles%rowtype;
  current_request public.procurement_requests%rowtype;
  item jsonb;
  item_quantity numeric;
  item_unit_price numeric;
  item_market_price numeric;
  item_total numeric(14,2) := 0;
begin
  select * into current_profile
  from public.profiles
  where profiles.id = (select auth.uid()) and profiles.active = true;

  if current_profile.id is null then raise exception 'active profile required'; end if;
  if not private.has_permission('request.create') then
    raise exception 'request creation permission required';
  end if;

  select * into current_request
  from public.procurement_requests
  where procurement_requests.id = target_request_id
  for update;

  if current_request.id is null then raise exception 'request not found'; end if;
  if current_request.requester_id <> current_profile.id then raise exception 'request owner required'; end if;
  if current_request.status <> 'returned' then raise exception 'request is not returned'; end if;
  if request_kind is null then raise exception 'invalid request kind'; end if;
  if char_length(trim(coalesce(request_title, ''))) not between 3 and 300 then
    raise exception 'invalid request title';
  end if;
  if char_length(trim(coalesce(request_rationale, ''))) not between 3 and 5000 then
    raise exception 'invalid request rationale';
  end if;
  if request_required_date is null or request_required_date < current_date then
    raise exception 'invalid required date';
  end if;
  if request_budget_year is null or request_budget_year not between 2500 and 2700 then
    raise exception 'invalid budget year';
  end if;
  if char_length(trim(coalesce(request_fund_source, ''))) not between 1 and 200 then
    raise exception 'invalid fund source';
  end if;
  if char_length(trim(coalesce(request_plan_name, ''))) > 300
    or char_length(trim(coalesce(request_expense_category, ''))) > 200 then
    raise exception 'invalid budget description';
  end if;
  if request_form_data is null
    or jsonb_typeof(request_form_data) <> 'object'
    or pg_column_size(request_form_data) > 50000
    or coalesce(request_form_data->>'formVersion', '') <> '1'
    or coalesce(request_form_data->>'formType', '') not in ('standard', 'w119') then
    raise exception 'invalid request form contract';
  end if;
  if request_form_data->>'formType' = 'standard' then
    if request_form_data->>'advanceFundingOption' not in (
      'borrow_before_purchase',
      'reimburse_after_purchase',
      'faculty_direct_pay_credit_vendor'
    ) then
      raise exception 'invalid advance funding option';
    end if;
    if jsonb_typeof(request_form_data->'budgetCodes') <> 'object'
      or trim(coalesce(request_form_data#>>'{budgetCodes,departmentCode}', '')) = ''
      or trim(coalesce(request_form_data#>>'{budgetCodes,fundCode}', '')) = ''
      or trim(coalesce(request_form_data#>>'{budgetCodes,activityCode}', '')) = '' then
      raise exception 'invalid budget codes';
    end if;
    if request_form_data->>'advanceFundingOption' = 'faculty_direct_pay_credit_vendor'
      and jsonb_typeof(request_form_data->'vendor') <> 'object' then
      raise exception 'vendor is required for direct payment';
    end if;
  end if;
  if request_items is null
    or jsonb_typeof(request_items) <> 'array'
    or jsonb_array_length(request_items) not between 1 and 200 then
    raise exception 'request must contain between 1 and 200 items';
  end if;

  for item in select * from jsonb_array_elements(request_items)
  loop
    if jsonb_typeof(item) <> 'object'
      or jsonb_typeof(item->'line_no') <> 'number'
      or jsonb_typeof(item->'quantity') <> 'number'
      or jsonb_typeof(item->'unit_price') <> 'number'
      or char_length(trim(coalesce(item->>'description', ''))) not between 1 and 500
      or char_length(trim(coalesce(item->>'unit', ''))) not between 1 and 100 then
      raise exception 'invalid request item';
    end if;

    item_quantity := (item->>'quantity')::numeric;
    item_unit_price := (item->>'unit_price')::numeric;
    if (item->>'line_no')::numeric <= 0
      or mod((item->>'line_no')::numeric, 1) <> 0
      or item_quantity <= 0
      or item_unit_price < 0 then
      raise exception 'invalid request item amount';
    end if;

    if item ? 'market_price' and jsonb_typeof(item->'market_price') <> 'null' then
      if jsonb_typeof(item->'market_price') <> 'number' then
        raise exception 'invalid market price';
      end if;
      item_market_price := (item->>'market_price')::numeric;
      if item_market_price < 0 then raise exception 'invalid market price'; end if;
    else
      item_market_price := null;
    end if;

    if request_form_data->>'formType' = 'w119'
      and (item_market_price is null or trim(coalesce(item->>'price_source', '')) = '') then
      raise exception 'w119 item requires market price and price source';
    end if;

    item_total := item_total + (item_quantity * item_unit_price);
    if item_total > 999999999999.99 then raise exception 'request total is too large'; end if;
  end loop;

  update public.procurement_requests
  set kind = request_kind,
    title = trim(request_title),
    rationale = trim(request_rationale),
    required_date = request_required_date,
    budget_year = request_budget_year,
    fund_source = trim(request_fund_source),
    plan_name = nullif(trim(request_plan_name), ''),
    expense_category = nullif(trim(request_expense_category), ''),
    form_data = request_form_data,
    estimated_amount = item_total,
    updated_at = now()
  where procurement_requests.id = current_request.id;

  delete from public.request_items where request_id = current_request.id;
  for item in select * from jsonb_array_elements(request_items)
  loop
    insert into public.request_items (
      request_id, line_no, description, quantity, unit, unit_price, market_price, price_source
    ) values (
      current_request.id,
      (item->>'line_no')::integer,
      trim(item->>'description'),
      (item->>'quantity')::numeric,
      trim(item->>'unit'),
      (item->>'unit_price')::numeric,
      nullif(item->>'market_price', '')::numeric,
      nullif(trim(item->>'price_source'), '')
    );
  end loop;

  return query select current_request.id, current_request.request_no;
end;
$$;

create or replace function public.resubmit_returned_procurement_request(target_request_id uuid)
returns table(request_no text, status public.request_status, current_step smallint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile public.profiles%rowtype;
  current_request public.procurement_requests%rowtype;
  current_task public.workflow_tasks%rowtype;
  workflow_step private.procurement_workflow_steps%rowtype;
begin
  select * into current_profile
  from public.profiles
  where profiles.id = (select auth.uid()) and profiles.active = true;

  if current_profile.id is null then raise exception 'active profile required'; end if;
  if not private.has_permission('request.create') then
    raise exception 'request creation permission required';
  end if;

  select * into current_request
  from public.procurement_requests
  where procurement_requests.id = target_request_id
  for update;

  if current_request.id is null then raise exception 'request not found'; end if;
  if current_request.requester_id <> current_profile.id then raise exception 'request owner required'; end if;
  if current_request.status <> 'returned' then raise exception 'request is not returned'; end if;

  select * into current_task
  from public.workflow_tasks task
  where task.request_id = current_request.id
    and task.step_no = current_request.current_step
    and task.status = 'returned'
  for update;

  if current_task.id is null then raise exception 'returned workflow task not found'; end if;

  select * into workflow_step
  from private.procurement_workflow_steps step
  where step.step_no = current_request.current_step;
  if workflow_step.step_no is null then raise exception 'workflow step is not configured'; end if;

  update public.workflow_tasks
  set status = 'pending',
    completed_at = null,
    assignee_id = null,
    due_at = now() + make_interval(days => workflow_step.due_days)
  where workflow_tasks.id = current_task.id;

  insert into public.workflow_actions (request_id, task_id, actor_id, action, comment, metadata)
  values (
    current_request.id,
    current_task.id,
    current_profile.id,
    'submit',
    'แก้ไขและส่งคำขอเข้าสู่กระบวนการใหม่',
    jsonb_build_object('resubmission', true)
  );

  update public.procurement_requests
  set status = 'submitted', submitted_at = now(), completed_at = null, updated_at = now()
  where procurement_requests.id = current_request.id
  returning * into current_request;

  return query select
    current_request.request_no,
    current_request.status,
    current_request.current_step;
end;
$$;

create or replace function public.protect_request_workflow_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_owner_submission boolean;
begin
  is_owner_submission := coalesce(
    old.requester_id = (select auth.uid())
    and new.requester_id = old.requester_id
    and new.department_id = old.department_id
    and old.status in ('draft', 'returned')
    and new.status = 'submitted'
    and new.submitted_at is not null
    and new.completed_at is not distinct from old.completed_at
    and (
      (old.status = 'draft' and old.current_step = 1 and exists (
        select 1
        from private.procurement_workflow_steps step
        where step.step_no = new.current_step
          and step.step_no = (
            select min(first_step.step_no) from private.procurement_workflow_steps first_step
          )
      ))
      or (old.status = 'returned' and new.current_step = old.current_step)
    ),
    false
  );

  if not private.is_privileged()
    and not is_owner_submission
    and (
      new.requester_id is distinct from old.requester_id
      or new.department_id is distinct from old.department_id
      or new.status is distinct from old.status
      or new.current_step is distinct from old.current_step
      or new.submitted_at is distinct from old.submitted_at
      or new.completed_at is distinct from old.completed_at
    ) then
    raise exception 'workflow fields may only be changed by authorized staff';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_request_submission_attachments on public.procurement_requests;
create trigger validate_request_submission_attachments
before update of status on public.procurement_requests
for each row
when (old.status in ('draft', 'returned') and new.status = 'submitted')
execute procedure public.validate_request_submission_attachments();

revoke all on function public.update_returned_procurement_request(
  uuid, public.request_kind, text, text, date, integer, text, text, text, jsonb, jsonb
) from public;
grant execute on function public.update_returned_procurement_request(
  uuid, public.request_kind, text, text, date, integer, text, text, text, jsonb, jsonb
) to authenticated;

revoke all on function public.resubmit_returned_procurement_request(uuid) from public;
grant execute on function public.resubmit_returned_procurement_request(uuid) to authenticated;

commit;
