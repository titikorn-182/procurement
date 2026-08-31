begin;

create table if not exists private.payment_workflow_steps (
  step_no smallint primary key check (step_no between 2 and 20),
  step_name text not null,
  required_role public.app_role not null,
  due_days smallint not null default 2 check (due_days between 0 and 365)
);

revoke all on table private.payment_workflow_steps from public, anon, authenticated;

insert into private.payment_workflow_steps (step_no, step_name, required_role, due_days) values
  (2, 'เจ้าหน้าที่พัสดุตรวจสอบคำขอเบิกจ่าย', 'procurement_staff', 2),
  (3, 'เจ้าหน้าที่พัสดุจัดทำรายงานขออนุมัติเบิกจ่าย', 'procurement_staff', 2),
  (4, 'หัวหน้าเจ้าหน้าที่พัสดุเห็นชอบ', 'head_procurement', 2),
  (5, 'เจ้าหน้าที่การเงินคุมยอด', 'finance_staff', 2),
  (6, 'รองคณบดีฝ่ายการเงินและพัสดุเห็นชอบ', 'deputy_finance', 2),
  (7, 'คณบดีเห็นชอบ', 'dean', 3),
  (8, 'หัวหน้าสำนักงานเลขานุการคณะเห็นชอบส่งวางฎีกา', 'head_office', 2)
on conflict (step_no) do update set
  step_name = excluded.step_name,
  required_role = excluded.required_role,
  due_days = excluded.due_days;

create table if not exists public.payment_workflow_tasks (
  id uuid primary key default gen_random_uuid(),
  payment_request_id uuid not null references public.payment_requests(id) on delete cascade,
  step_no smallint not null,
  step_name text not null,
  required_role public.app_role not null,
  assignee_id uuid references public.profiles(id),
  status public.task_status not null default 'pending',
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (payment_request_id, step_no)
);

create table if not exists public.payment_workflow_actions (
  id uuid primary key default gen_random_uuid(),
  payment_request_id uuid not null references public.payment_requests(id) on delete cascade,
  task_id uuid references public.payment_workflow_tasks(id),
  actor_id uuid not null references public.profiles(id),
  action public.workflow_action not null,
  comment text check (char_length(comment) <= 2000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists payment_workflow_tasks_assignee_idx
  on public.payment_workflow_tasks(assignee_id, status);
create index if not exists payment_workflow_tasks_role_idx
  on public.payment_workflow_tasks(required_role, status);
create index if not exists payment_workflow_actions_payment_idx
  on public.payment_workflow_actions(payment_request_id, created_at);

alter table public.payment_workflow_tasks enable row level security;
alter table public.payment_workflow_actions enable row level security;

create or replace function private.can_read_payment(target_payment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    exists (
      select 1
      from public.payment_requests p
      where p.id = target_payment_id
        and p.requester_id = (select auth.uid())
    )
    or private.has_permission('payment.read_all')
    or exists (
      select 1
      from public.payment_workflow_tasks t
      join public.profiles p on p.id = (select auth.uid()) and p.active = true
      where t.payment_request_id = target_payment_id
        and t.status = 'pending'
        and (t.assignee_id = p.id or (t.assignee_id is null and t.required_role = p.role))
    ),
    false
  )
$$;

drop policy if exists payment_tasks_read on public.payment_workflow_tasks;
create policy payment_tasks_read on public.payment_workflow_tasks for select to authenticated
using (private.can_read_payment(payment_request_id));
drop policy if exists payment_actions_read on public.payment_workflow_actions;
create policy payment_actions_read on public.payment_workflow_actions for select to authenticated
using (private.can_read_payment(payment_request_id));
revoke all on public.payment_workflow_tasks from public, anon, authenticated;
revoke all on public.payment_workflow_actions from public, anon, authenticated;
grant select on public.payment_workflow_tasks to authenticated;
grant select on public.payment_workflow_actions to authenticated;

alter table public.payment_requests
  add column if not exists idempotency_key uuid;
create unique index if not exists payment_requests_requester_idempotency_idx
  on public.payment_requests(requester_id, idempotency_key)
  where idempotency_key is not null;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'payment_requests_invoice_no_length'
      and conrelid = 'public.payment_requests'::regclass
  ) then
    alter table public.payment_requests
      add constraint payment_requests_invoice_no_length
      check (char_length(trim(invoice_no)) between 1 and 100) not valid;
  end if;
  if not exists (
    select 1 from pg_constraint
    where conname = 'payment_requests_delivery_length'
      and conrelid = 'public.payment_requests'::regclass
  ) then
    alter table public.payment_requests
      add constraint payment_requests_delivery_length
      check (char_length(trim(delivery_detail)) between 1 and 2000) not valid;
  end if;
end;
$$;

drop function if exists public.submit_payment_request(uuid, text, date, numeric, numeric, text);

create or replace function public.submit_payment_request(
  source_request_id uuid,
  payment_idempotency_key uuid,
  payment_invoice_no text,
  payment_invoice_date date,
  payment_subtotal numeric,
  payment_vat_amount numeric,
  payment_delivery_detail text
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
  first_step private.payment_workflow_steps%rowtype;
  already_requested numeric(14,2);
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

  select * into source_request
  from public.procurement_requests
  where id = source_request_id
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
    if existing_payment.procurement_request_id <> source_request.id
      or existing_payment.invoice_no <> trim(payment_invoice_no)
      or existing_payment.invoice_date <> payment_invoice_date
      or existing_payment.subtotal <> payment_subtotal
      or existing_payment.vat_amount <> payment_vat_amount
      or existing_payment.delivery_detail <> trim(payment_delivery_detail) then
      raise exception 'idempotency key was reused with different payment data';
    end if;
    return query select existing_payment.id, existing_payment.payment_no;
    return;
  end if;

  select coalesce(sum(total_amount), 0) into already_requested
  from public.payment_requests
  where procurement_request_id = source_request.id
    and status <> 'cancelled';
  if already_requested + payment_subtotal + payment_vat_amount > source_request.estimated_amount then
    raise exception 'payment amount exceeds remaining request amount';
  end if;

  select * into first_step
  from private.payment_workflow_steps
  order by step_no
  limit 1;
  if first_step.step_no is null then raise exception 'payment workflow is not configured'; end if;

  insert into public.payment_requests (
    procurement_request_id, requester_id, idempotency_key, invoice_no, invoice_date,
    subtotal, vat_amount, delivery_detail, status, current_step, submitted_at
  ) values (
    source_request.id, current_profile.id, payment_idempotency_key, trim(payment_invoice_no),
    payment_invoice_date, payment_subtotal, payment_vat_amount,
    trim(payment_delivery_detail), 'submitted', first_step.step_no, now()
  ) returning * into new_payment;

  insert into public.payment_workflow_tasks (
    payment_request_id, step_no, step_name, required_role, due_at
  ) values (
    new_payment.id,
    first_step.step_no,
    first_step.step_name,
    first_step.required_role,
    now() + make_interval(days => first_step.due_days)
  );

  insert into public.payment_workflow_actions (
    payment_request_id, actor_id, action, comment
  ) values (
    new_payment.id,
    current_profile.id,
    'submit',
    'ยื่นคำขอเบิกจ่ายเข้าสู่กระบวนการ'
  );

  return query select new_payment.id, new_payment.payment_no;
end;
$$;

revoke all on function public.submit_payment_request(
  uuid, uuid, text, date, numeric, numeric, text
) from public;
grant execute on function public.submit_payment_request(
  uuid, uuid, text, date, numeric, numeric, text
) to authenticated;

create or replace function public.transition_payment_request(
  target_payment_id uuid,
  decision public.workflow_action,
  decision_comment text default null
)
returns table(payment_no text, status public.payment_status, current_step smallint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile public.profiles%rowtype;
  current_payment public.payment_requests%rowtype;
  current_task public.payment_workflow_tasks%rowtype;
  next_step private.payment_workflow_steps%rowtype;
begin
  select * into current_profile
  from public.profiles
  where id = (select auth.uid()) and active = true;
  if current_profile.id is null then raise exception 'active profile required'; end if;
  if decision is null or decision not in ('approve', 'return', 'reject') then
    raise exception 'invalid transition';
  end if;
  if char_length(coalesce(decision_comment, '')) > 2000 then raise exception 'comment is too long'; end if;

  select * into current_payment
  from public.payment_requests
  where id = target_payment_id
  for update;
  if current_payment.id is null then raise exception 'payment request not found'; end if;
  if current_payment.status in ('voucher_submitted', 'completed', 'cancelled') then
    raise exception 'payment request is already in a terminal state';
  end if;

  select * into current_task
  from public.payment_workflow_tasks t
  where t.payment_request_id = current_payment.id
    and t.step_no = current_payment.current_step
    and t.status = 'pending'
  for update;
  if current_task.id is null then raise exception 'pending payment task not found'; end if;
  if not private.has_permission('payment.transition_all')
    and current_task.assignee_id is distinct from current_profile.id
    and (current_task.assignee_id is not null or current_task.required_role <> current_profile.role) then
    raise exception 'payment task permission required';
  end if;

  update public.payment_workflow_tasks
  set status = case
      when decision = 'return' then 'returned'::public.task_status
      when decision = 'reject' then 'rejected'::public.task_status
      else 'completed'::public.task_status
    end,
    completed_at = now()
  where id = current_task.id;

  insert into public.payment_workflow_actions (
    payment_request_id, task_id, actor_id, action, comment
  ) values (
    current_payment.id,
    current_task.id,
    current_profile.id,
    case
      when decision = 'approve' and current_payment.current_step = 5
        then 'budget_control'::public.workflow_action
      else decision
    end,
    nullif(trim(decision_comment), '')
  );

  if decision = 'return' then
    update public.payment_requests
    set status = 'returned'
    where id = current_payment.id
    returning * into current_payment;
  elsif decision = 'reject' then
    update public.payment_requests
    set status = 'cancelled'
    where id = current_payment.id
    returning * into current_payment;
  else
    select * into next_step
    from private.payment_workflow_steps
    where step_no > current_payment.current_step
    order by step_no
    limit 1;

    if next_step.step_no is null then
      update public.payment_requests
      set status = 'voucher_submitted'
      where id = current_payment.id
      returning * into current_payment;
    else
      insert into public.payment_workflow_tasks (
        payment_request_id, step_no, step_name, required_role, due_at
      ) values (
        current_payment.id,
        next_step.step_no,
        next_step.step_name,
        next_step.required_role,
        now() + make_interval(days => next_step.due_days)
      );
      update public.payment_requests
      set current_step = next_step.step_no,
        status = 'under_review'
      where id = current_payment.id
      returning * into current_payment;
    end if;
  end if;

  return query select
    current_payment.payment_no,
    current_payment.status,
    current_payment.current_step;
end;
$$;

revoke all on function public.transition_payment_request(uuid, public.workflow_action, text)
  from public;
grant execute on function public.transition_payment_request(uuid, public.workflow_action, text)
  to authenticated;

commit;
