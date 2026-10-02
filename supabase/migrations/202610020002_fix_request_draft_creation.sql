begin;

-- Create the draft directly. The previous wrapper correctly reused the
-- hardened submit validation, but its submitted -> draft update was blocked
-- by protect_request_workflow_fields for ordinary requesters.
create or replace function public.create_procurement_request_draft(
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
  if current_profile.department_id is null then raise exception 'department is required'; end if;
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

  insert into public.procurement_requests (
    requester_id, department_id, kind, title, rationale, required_date,
    budget_year, fund_source, plan_name, expense_category, form_data,
    estimated_amount, status, current_step, submitted_at
  ) values (
    current_profile.id, current_profile.department_id, request_kind,
    trim(request_title), trim(request_rationale), request_required_date,
    request_budget_year, trim(request_fund_source), nullif(trim(request_plan_name), ''),
    nullif(trim(request_expense_category), ''), request_form_data,
    item_total, 'draft', 1, null
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

  return query select new_request.id, new_request.request_no;
end;
$$;

revoke all on function public.create_procurement_request_draft(
  public.request_kind, text, text, date, integer, text, text, text, jsonb, jsonb
) from public;
grant execute on function public.create_procurement_request_draft(
  public.request_kind, text, text, date, integer, text, text, text, jsonb, jsonb
) to authenticated;

commit;
