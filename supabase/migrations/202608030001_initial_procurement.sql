begin;

create schema if not exists private;

do $$ begin
  create type public.app_role as enum (
    'user', 'procurement_staff', 'finance_staff', 'head_procurement',
    'deputy_secretary', 'deputy_finance', 'dean', 'head_office', 'admin'
  );
exception when duplicate_object then null; end $$;
do $$ begin create type public.request_kind as enum ('purchase', 'hire'); exception when duplicate_object then null; end $$;
do $$ begin
  create type public.request_status as enum (
    'draft', 'submitted', 'under_review', 'returned', 'not_approved',
    'approved', 'budget_control', 'sourcing', 'ordered', 'completed', 'cancelled'
  );
exception when duplicate_object then null; end $$;
do $$ begin create type public.task_status as enum ('pending', 'completed', 'returned', 'rejected', 'cancelled'); exception when duplicate_object then null; end $$;
do $$ begin create type public.workflow_action as enum ('submit', 'approve', 'return', 'reject', 'budget_control', 'complete', 'cancel'); exception when duplicate_object then null; end $$;
do $$ begin create type public.payment_status as enum ('draft', 'submitted', 'under_review', 'returned', 'approved', 'voucher_submitted', 'completed', 'cancelled'); exception when duplicate_object then null; end $$;

create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name_th text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  employee_code text unique,
  full_name text not null default '',
  department_id uuid references public.departments(id),
  role public.app_role not null default 'user',
  position_title text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create sequence if not exists public.procurement_request_no_seq start 1;
create sequence if not exists public.payment_request_no_seq start 1;

create or replace function private.next_request_no(prefix text, seq_name text)
returns text language plpgsql security definer set search_path = '' as $$
declare next_value bigint;
begin
  execute format('select nextval(%L)', seq_name) into next_value;
  return prefix || to_char(current_date, 'YYMM') || '-' || lpad(next_value::text, 5, '0');
end;
$$;

create table if not exists public.procurement_requests (
  id uuid primary key default gen_random_uuid(),
  request_no text not null unique default private.next_request_no('PR', 'public.procurement_request_no_seq'),
  requester_id uuid not null references public.profiles(id),
  department_id uuid not null references public.departments(id),
  kind public.request_kind not null,
  title text not null check (char_length(title) between 3 and 300),
  rationale text not null,
  required_date date,
  budget_year integer not null check (budget_year between 2500 and 2700),
  fund_source text not null,
  plan_name text,
  expense_category text,
  estimated_amount numeric(14,2) not null default 0 check (estimated_amount >= 0),
  status public.request_status not null default 'draft',
  current_step smallint not null default 1 check (current_step between 1 and 20),
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.request_items (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.procurement_requests(id) on delete cascade,
  line_no integer not null check (line_no > 0),
  description text not null,
  quantity numeric(12,2) not null check (quantity > 0),
  unit text not null,
  unit_price numeric(14,2) not null check (unit_price >= 0),
  total_amount numeric(14,2) generated always as (quantity * unit_price) stored,
  unique(request_id, line_no)
);

create table if not exists public.request_attachments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.procurement_requests(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes >= 0),
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.workflow_tasks (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.procurement_requests(id) on delete cascade,
  step_no smallint not null,
  step_name text not null,
  required_role public.app_role not null,
  assignee_id uuid references public.profiles(id),
  status public.task_status not null default 'pending',
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(request_id, step_no)
);

create table if not exists public.workflow_actions (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.procurement_requests(id) on delete cascade,
  task_id uuid references public.workflow_tasks(id),
  actor_id uuid not null references public.profiles(id),
  action public.workflow_action not null,
  comment text check (char_length(comment) <= 2000),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  payment_no text not null unique default private.next_request_no('PV', 'public.payment_request_no_seq'),
  procurement_request_id uuid not null references public.procurement_requests(id),
  requester_id uuid not null references public.profiles(id),
  invoice_no text not null,
  invoice_date date not null,
  subtotal numeric(14,2) not null check (subtotal >= 0),
  vat_amount numeric(14,2) not null default 0 check (vat_amount >= 0),
  total_amount numeric(14,2) generated always as (subtotal + vat_amount) stored,
  delivery_detail text not null,
  status public.payment_status not null default 'draft',
  current_step smallint not null default 1 check (current_step between 1 and 20),
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payment_attachments (
  id uuid primary key default gen_random_uuid(),
  payment_request_id uuid not null references public.payment_requests(id) on delete cascade,
  storage_path text not null unique,
  file_name text not null,
  mime_type text,
  size_bytes bigint check (size_bytes >= 0),
  uploaded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists procurement_requests_requester_idx on public.procurement_requests(requester_id);
create index if not exists procurement_requests_department_idx on public.procurement_requests(department_id);
create index if not exists procurement_requests_status_idx on public.procurement_requests(status, current_step);
create index if not exists workflow_tasks_assignee_idx on public.workflow_tasks(assignee_id, status);
create index if not exists workflow_tasks_role_idx on public.workflow_tasks(required_role, status);
create index if not exists payment_requests_requester_idx on public.payment_requests(requester_id);

create or replace function private.current_role()
returns public.app_role language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = (select auth.uid()) and active = true
$$;

create or replace function private.is_privileged()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.current_role() in ('procurement_staff','finance_staff','head_procurement','deputy_secretary','deputy_finance','dean','head_office','admin'), false)
$$;

create or replace function private.is_admin()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.current_role() = 'admin', false)
$$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, employee_code, full_name)
  values (new.id, new.raw_user_meta_data ->> 'employee_code', coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)));
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
drop trigger if exists profiles_updated_at on public.profiles;
drop trigger if exists requests_updated_at on public.procurement_requests;
drop trigger if exists payments_updated_at on public.payment_requests;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
create trigger requests_updated_at before update on public.procurement_requests for each row execute procedure public.set_updated_at();
create trigger payments_updated_at before update on public.payment_requests for each row execute procedure public.set_updated_at();

create or replace function public.protect_request_workflow_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_privileged() and (
    new.requester_id is distinct from old.requester_id or
    new.department_id is distinct from old.department_id or
    new.status is distinct from old.status or
    new.current_step is distinct from old.current_step or
    new.submitted_at is distinct from old.submitted_at or
    new.completed_at is distinct from old.completed_at
  ) then raise exception 'workflow fields may only be changed by authorized staff'; end if;
  return new;
end;
$$;
drop trigger if exists protect_request_workflow on public.procurement_requests;
create trigger protect_request_workflow before update on public.procurement_requests
for each row execute procedure public.protect_request_workflow_fields();

create or replace function public.protect_payment_workflow_fields()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_privileged() and (
    new.requester_id is distinct from old.requester_id or
    new.status is distinct from old.status or
    new.current_step is distinct from old.current_step or
    new.submitted_at is distinct from old.submitted_at
  ) then raise exception 'workflow fields may only be changed by authorized staff'; end if;
  return new;
end;
$$;
drop trigger if exists protect_payment_workflow on public.payment_requests;
create trigger protect_payment_workflow before update on public.payment_requests
for each row execute procedure public.protect_payment_workflow_fields();

alter table public.departments enable row level security;
alter table public.profiles enable row level security;
alter table public.procurement_requests enable row level security;
alter table public.request_items enable row level security;
alter table public.request_attachments enable row level security;
alter table public.workflow_tasks enable row level security;
alter table public.workflow_actions enable row level security;
alter table public.payment_requests enable row level security;
alter table public.payment_attachments enable row level security;

drop policy if exists departments_read on public.departments;
drop policy if exists departments_admin on public.departments;
drop policy if exists profiles_read on public.profiles;
drop policy if exists profiles_self_update on public.profiles;
drop policy if exists profiles_admin_all on public.profiles;
drop policy if exists requests_read on public.procurement_requests;
drop policy if exists requests_insert on public.procurement_requests;
drop policy if exists requests_owner_update_draft on public.procurement_requests;
drop policy if exists requests_staff_update on public.procurement_requests;
drop policy if exists items_read on public.request_items;
drop policy if exists items_owner_write on public.request_items;
drop policy if exists request_files_read on public.request_attachments;
drop policy if exists request_files_owner_write on public.request_attachments;
drop policy if exists tasks_read on public.workflow_tasks;
drop policy if exists tasks_privileged_write on public.workflow_tasks;
drop policy if exists actions_read on public.workflow_actions;
drop policy if exists actions_insert on public.workflow_actions;
drop policy if exists payments_read on public.payment_requests;
drop policy if exists payments_insert on public.payment_requests;
drop policy if exists payments_owner_update on public.payment_requests;
drop policy if exists payments_staff_update on public.payment_requests;
drop policy if exists payment_files_read on public.payment_attachments;
drop policy if exists payment_files_owner_write on public.payment_attachments;

create policy departments_read on public.departments for select to authenticated using (active or private.is_admin());
create policy departments_admin on public.departments for all to authenticated using (private.is_admin()) with check (private.is_admin());

create policy profiles_read on public.profiles for select to authenticated
using (id = (select auth.uid()) or private.is_privileged());
create policy profiles_self_update on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy profiles_admin_all on public.profiles for all to authenticated
using (private.is_admin()) with check (private.is_admin());

create policy requests_read on public.procurement_requests for select to authenticated
using (requester_id = (select auth.uid()) or private.is_privileged());
create policy requests_insert on public.procurement_requests for insert to authenticated
with check (requester_id = (select auth.uid()) and status = 'draft');
create policy requests_owner_update_draft on public.procurement_requests for update to authenticated
using (requester_id = (select auth.uid()) and status in ('draft','returned'))
with check (requester_id = (select auth.uid()));
create policy requests_staff_update on public.procurement_requests for update to authenticated
using (private.is_privileged()) with check (private.is_privileged());

create policy items_read on public.request_items for select to authenticated using (
  exists (select 1 from public.procurement_requests r where r.id = request_id and (r.requester_id = (select auth.uid()) or private.is_privileged()))
);
create policy items_owner_write on public.request_items for all to authenticated using (
  exists (select 1 from public.procurement_requests r where r.id = request_id and r.requester_id = (select auth.uid()) and r.status in ('draft','returned'))
) with check (
  exists (select 1 from public.procurement_requests r where r.id = request_id and r.requester_id = (select auth.uid()) and r.status in ('draft','returned'))
);

create policy request_files_read on public.request_attachments for select to authenticated using (
  exists (select 1 from public.procurement_requests r where r.id = request_id and (r.requester_id = (select auth.uid()) or private.is_privileged()))
);
create policy request_files_owner_write on public.request_attachments for all to authenticated
using (uploaded_by = (select auth.uid())) with check (uploaded_by = (select auth.uid()));

create policy tasks_read on public.workflow_tasks for select to authenticated using (
  assignee_id = (select auth.uid()) or required_role = private.current_role() or private.is_admin()
  or exists (select 1 from public.procurement_requests r where r.id = request_id and r.requester_id = (select auth.uid()))
);
create policy tasks_privileged_write on public.workflow_tasks for all to authenticated
using (private.is_privileged()) with check (private.is_privileged());

create policy actions_read on public.workflow_actions for select to authenticated using (
  actor_id = (select auth.uid()) or private.is_privileged()
  or exists (select 1 from public.procurement_requests r where r.id = request_id and r.requester_id = (select auth.uid()))
);
create policy actions_insert on public.workflow_actions for insert to authenticated
with check (actor_id = (select auth.uid()) and (
  private.is_privileged() or exists (select 1 from public.procurement_requests r where r.id = request_id and r.requester_id = (select auth.uid()))
));

create policy payments_read on public.payment_requests for select to authenticated
using (requester_id = (select auth.uid()) or private.is_privileged());
create policy payments_insert on public.payment_requests for insert to authenticated
with check (requester_id = (select auth.uid()) and status = 'draft');
create policy payments_owner_update on public.payment_requests for update to authenticated
using (requester_id = (select auth.uid()) and status in ('draft','returned')) with check (requester_id = (select auth.uid()));
create policy payments_staff_update on public.payment_requests for update to authenticated
using (private.is_privileged()) with check (private.is_privileged());
create policy payment_files_read on public.payment_attachments for select to authenticated using (
  exists (select 1 from public.payment_requests p where p.id = payment_request_id and (p.requester_id = (select auth.uid()) or private.is_privileged()))
);
create policy payment_files_owner_write on public.payment_attachments for all to authenticated
using (uploaded_by = (select auth.uid())) with check (uploaded_by = (select auth.uid()));

grant usage on schema public to authenticated;
grant select on public.departments, public.profiles to authenticated;
grant update (full_name, position_title) on public.profiles to authenticated;
grant select, insert, update on public.procurement_requests, public.request_items, public.request_attachments to authenticated;
grant select, insert, update on public.workflow_tasks, public.workflow_actions to authenticated;
grant select, insert, update on public.payment_requests, public.payment_attachments to authenticated;
grant usage, select on all sequences in schema public to authenticated;

insert into public.departments (code, name_th) values
('SECRETARIAT', 'สำนักงานเลขานุการคณะ'),
('FINANCE', 'งานการเงินและบัญชี'),
('PROCUREMENT', 'งานพัสดุ'),
('IT', 'งานเทคโนโลยีสารสนเทศ')
on conflict (code) do nothing;

commit;
