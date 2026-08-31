begin;

create table if not exists private.procurement_workflow_steps (
  step_no smallint primary key check (step_no between 2 and 20),
  step_name text not null,
  required_role public.app_role not null,
  due_days smallint not null default 2 check (due_days between 0 and 365)
);

revoke all on table private.procurement_workflow_steps from public, anon, authenticated;

insert into private.procurement_workflow_steps (step_no, step_name, required_role, due_days) values
  (2, 'เจ้าหน้าที่พัสดุตรวจสอบ', 'procurement_staff', 2),
  (3, 'รองหัวหน้าสำนักงานเห็นชอบ', 'deputy_secretary', 2),
  (4, 'ผู้บริหารอนุมัติหลักการ', 'dean', 3),
  (5, 'เจ้าหน้าที่พัสดุจัดทำรายงานขอซื้อขอจ้าง', 'procurement_staff', 2),
  (6, 'หัวหน้าเจ้าหน้าที่พัสดุเห็นชอบ', 'head_procurement', 2),
  (7, 'เจ้าหน้าที่การเงินคุมยอด', 'finance_staff', 2),
  (8, 'รองคณบดีฝ่ายการเงินและพัสดุเห็นชอบ', 'deputy_finance', 2),
  (9, 'คณบดีเห็นชอบ', 'dean', 3),
  (10, 'เจ้าหน้าที่พัสดุสืบราคา', 'procurement_staff', 3),
  (11, 'หัวหน้าเจ้าหน้าที่พัสดุเห็นชอบสั่งซื้อหรือสั่งจ้าง', 'head_procurement', 2)
on conflict (step_no) do update set
  step_name = excluded.step_name,
  required_role = excluded.required_role,
  due_days = excluded.due_days;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'procurement_requests_rationale_length'
      and conrelid = 'public.procurement_requests'::regclass
  ) then
    alter table public.procurement_requests
      add constraint procurement_requests_rationale_length
      check (char_length(rationale) between 3 and 5000) not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'request_items_description_length'
      and conrelid = 'public.request_items'::regclass
  ) then
    alter table public.request_items
      add constraint request_items_description_length
      check (char_length(trim(description)) between 1 and 500) not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'request_items_unit_length'
      and conrelid = 'public.request_items'::regclass
  ) then
    alter table public.request_items
      add constraint request_items_unit_length
      check (char_length(trim(unit)) between 1 and 100) not valid;
  end if;
end;
$$;

drop function if exists public.submit_procurement_request(
  public.request_kind, text, text, date, integer, text, text, text, jsonb
);

create or replace function public.submit_procurement_request(
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
  new_request public.procurement_requests%rowtype;
  first_step private.procurement_workflow_steps%rowtype;
  item jsonb;
  item_quantity numeric;
  item_unit_price numeric;
  item_market_price numeric;
  item_total numeric(14,2) := 0;
begin
  select * into current_profile
  from public.profiles
  where profiles.id = (select auth.uid()) and profiles.active = true;

  if current_profile.id is null then
    raise exception 'active profile required';
  end if;
  if current_profile.department_id is null then
    raise exception 'department is required';
  end if;
  if not private.has_permission('request.create') then
    raise exception 'request creation permission required';
  end if;
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
  else
    if trim(coalesce(request_form_data->>'documentNo', '')) = ''
      or trim(coalesce(request_form_data->>'memoDate', '')) = ''
      or trim(coalesce(request_form_data->>'departmentName', '')) = ''
      or trim(coalesce(request_form_data->>'phone', '')) = ''
      or trim(coalesce(request_form_data->>'addressee', '')) = ''
      or jsonb_typeof(request_form_data->'budgetCodes') <> 'object' then
      raise exception 'invalid w119 form data';
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

  select * into first_step
  from private.procurement_workflow_steps
  order by step_no
  limit 1;
  if first_step.step_no is null then raise exception 'workflow is not configured'; end if;

  insert into public.procurement_requests (
    requester_id, department_id, kind, title, rationale, required_date,
    budget_year, fund_source, plan_name, expense_category, form_data,
    estimated_amount, status, current_step, submitted_at
  ) values (
    current_profile.id, current_profile.department_id, request_kind,
    trim(request_title), trim(request_rationale), request_required_date,
    request_budget_year, trim(request_fund_source), nullif(trim(request_plan_name), ''),
    nullif(trim(request_expense_category), ''), request_form_data,
    item_total, 'submitted', first_step.step_no, now()
  ) returning * into new_request;

  for item in select * from jsonb_array_elements(request_items)
  loop
    insert into public.request_items (
      request_id, line_no, description, quantity, unit, unit_price, market_price, price_source
    ) values (
      new_request.id,
      (item->>'line_no')::integer,
      trim(item->>'description'),
      (item->>'quantity')::numeric,
      trim(item->>'unit'),
      (item->>'unit_price')::numeric,
      nullif(item->>'market_price', '')::numeric,
      nullif(trim(item->>'price_source'), '')
    );
  end loop;

  insert into public.workflow_tasks (request_id, step_no, step_name, required_role, due_at)
  values (
    new_request.id,
    first_step.step_no,
    first_step.step_name,
    first_step.required_role,
    now() + make_interval(days => first_step.due_days)
  );

  insert into public.workflow_actions (request_id, actor_id, action, comment, metadata)
  values (
    new_request.id,
    current_profile.id,
    'submit',
    'ยื่นคำขอเข้าสู่กระบวนการ',
    jsonb_build_object(
      'formType', request_form_data->>'formType',
      'formVersion', request_form_data->>'formVersion'
    )
  );

  return query select new_request.id, new_request.request_no;
end;
$$;

revoke all on function public.submit_procurement_request(
  public.request_kind, text, text, date, integer, text, text, text, jsonb, jsonb
) from public;
grant execute on function public.submit_procurement_request(
  public.request_kind, text, text, date, integer, text, text, text, jsonb, jsonb
) to authenticated;

create or replace function public.transition_procurement_request(
  target_request_id uuid,
  decision public.workflow_action,
  decision_comment text default null
)
returns table(request_no text, status public.request_status, current_step smallint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile public.profiles%rowtype;
  current_request public.procurement_requests%rowtype;
  current_task public.workflow_tasks%rowtype;
  next_step private.procurement_workflow_steps%rowtype;
  recorded_action public.workflow_action;
begin
  select * into current_profile
  from public.profiles
  where id = (select auth.uid()) and active = true;
  if current_profile.id is null then raise exception 'active profile required'; end if;
  if decision is null or decision not in ('approve', 'return', 'reject') then
    raise exception 'invalid transition';
  end if;
  if char_length(coalesce(decision_comment, '')) > 2000 then raise exception 'comment is too long'; end if;

  select * into current_request
  from public.procurement_requests
  where id = target_request_id
  for update;
  if current_request.id is null then raise exception 'request not found'; end if;
  if current_request.status in ('not_approved', 'ordered', 'completed', 'cancelled') then
    raise exception 'request is already in a terminal state';
  end if;

  select * into current_task
  from public.workflow_tasks t
  where t.request_id = current_request.id
    and t.step_no = current_request.current_step
    and t.status = 'pending'
  for update;
  if current_task.id is null then raise exception 'pending workflow task not found'; end if;
  if not private.has_permission('request.transition_all')
    and current_task.assignee_id is distinct from current_profile.id
    and (current_task.assignee_id is not null or current_task.required_role <> current_profile.role) then
    raise exception 'workflow task permission required';
  end if;

  recorded_action := case
    when decision = 'approve' and current_request.current_step = 7 then 'budget_control'
    else decision
  end;

  update public.workflow_tasks
  set status = case
      when decision = 'return' then 'returned'::public.task_status
      when decision = 'reject' then 'rejected'::public.task_status
      else 'completed'::public.task_status
    end,
    completed_at = now()
  where id = current_task.id;

  insert into public.workflow_actions (request_id, task_id, actor_id, action, comment)
  values (
    current_request.id,
    current_task.id,
    current_profile.id,
    recorded_action,
    nullif(trim(decision_comment), '')
  );

  if decision = 'return' then
    update public.procurement_requests
    set status = 'returned'
    where id = current_request.id
    returning * into current_request;
  elsif decision = 'reject' then
    update public.procurement_requests
    set status = 'not_approved', completed_at = now()
    where id = current_request.id
    returning * into current_request;
  else
    select * into next_step
    from private.procurement_workflow_steps
    where step_no > current_request.current_step
    order by step_no
    limit 1;

    if next_step.step_no is null then
      update public.procurement_requests
      set status = 'ordered', completed_at = now()
      where id = current_request.id
      returning * into current_request;
    else
      insert into public.workflow_tasks (request_id, step_no, step_name, required_role, due_at)
      values (
        current_request.id,
        next_step.step_no,
        next_step.step_name,
        next_step.required_role,
        now() + make_interval(days => next_step.due_days)
      );
      update public.procurement_requests
      set current_step = next_step.step_no,
        status = case
          when next_step.step_no = 7 then 'budget_control'::public.request_status
          when next_step.step_no = 10 then 'sourcing'::public.request_status
          else 'under_review'::public.request_status
        end
      where id = current_request.id
      returning * into current_request;
    end if;
  end if;

  return query select
    current_request.request_no,
    current_request.status,
    current_request.current_step;
end;
$$;

revoke all on function public.transition_procurement_request(uuid, public.workflow_action, text)
  from public;
grant execute on function public.transition_procurement_request(uuid, public.workflow_action, text)
  to authenticated;

commit;
