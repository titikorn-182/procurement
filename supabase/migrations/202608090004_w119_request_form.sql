begin;

alter table public.procurement_requests
  add column if not exists form_data jsonb not null default '{}'::jsonb;

alter table public.request_items
  add column if not exists market_price numeric(14,2),
  add column if not exists price_source text;

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
  item jsonb;
  item_total numeric(14,2) := 0;
begin
  select * into current_profile from public.profiles
  where profiles.id = (select auth.uid()) and profiles.active = true;

  if current_profile.id is null then raise exception 'ไม่พบโปรไฟล์ผู้ใช้งานหรือบัญชีถูกระงับ'; end if;
  if current_profile.department_id is null then raise exception 'โปรไฟล์ยังไม่ได้กำหนดหน่วยงาน'; end if;
  if jsonb_typeof(request_items) <> 'array' or jsonb_array_length(request_items) = 0 then
    raise exception 'ต้องมีรายการพัสดุหรือบริการอย่างน้อย 1 รายการ';
  end if;

  for item in select * from jsonb_array_elements(request_items) loop
    if coalesce((item->>'quantity')::numeric, 0) <= 0 or coalesce((item->>'unit_price')::numeric, -1) < 0 then
      raise exception 'จำนวนและราคาต่อหน่วยไม่ถูกต้อง';
    end if;
    item_total := item_total + ((item->>'quantity')::numeric * (item->>'unit_price')::numeric);
  end loop;

  insert into public.procurement_requests (
    requester_id, department_id, kind, title, rationale, required_date,
    budget_year, fund_source, plan_name, expense_category, form_data,
    estimated_amount, status, current_step, submitted_at
  ) values (
    current_profile.id, current_profile.department_id, request_kind,
    trim(request_title), trim(request_rationale), request_required_date,
    request_budget_year, trim(request_fund_source), nullif(trim(request_plan_name), ''),
    nullif(trim(request_expense_category), ''), coalesce(request_form_data, '{}'::jsonb),
    item_total, 'submitted', 2, now()
  ) returning * into new_request;

  for item in select * from jsonb_array_elements(request_items) loop
    insert into public.request_items (
      request_id, line_no, description, quantity, unit, unit_price, market_price, price_source
    ) values (
      new_request.id, (item->>'line_no')::integer, trim(item->>'description'),
      (item->>'quantity')::numeric, trim(item->>'unit'), (item->>'unit_price')::numeric,
      nullif(item->>'market_price', '')::numeric, nullif(trim(item->>'price_source'), '')
    );
  end loop;

  insert into public.workflow_tasks (request_id, step_no, step_name, required_role, due_at)
  values (new_request.id, 2, 'เจ้าหน้าที่พัสดุตรวจสอบ', 'procurement_staff', now() + interval '2 days');

  insert into public.workflow_actions (request_id, actor_id, action, comment)
  values (new_request.id, current_profile.id, 'submit', 'ยื่นคำขอตามแบบ ว119 เข้าสู่กระบวนการ');

  return query select new_request.id, new_request.request_no;
end;
$$;

revoke all on function public.submit_procurement_request(public.request_kind,text,text,date,integer,text,text,text,jsonb,jsonb) from public;
grant execute on function public.submit_procurement_request(public.request_kind,text,text,date,integer,text,text,text,jsonb,jsonb) to authenticated;

commit;
