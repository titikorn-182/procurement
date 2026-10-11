-- Read-only projections for paginated lists. PostgreSQL 15+ security_invoker is
-- essential: joins, overdue checks, filters and counts all use the caller's RLS.
begin;

create or replace view public.procurement_request_list
with (security_invoker = true) as
select r.id, r.request_no, r.kind, r.title, r.estimated_amount, r.budget_year,
  r.status, r.current_step, r.created_at, r.required_date,
  coalesce(d.name_th, '—') as department_name,
  coalesce(p.full_name, '—') as requester_name,
  case when exists (
    select 1 from public.workflow_tasks t
    where t.request_id = r.id and t.status = 'pending' and t.due_at < now()
  ) then 'overdue'
    when r.status in ('submitted', 'under_review') then 'review'
    else r.status::text end as list_status,
  concat_ws(' ', r.request_no, r.title, d.name_th) as search_text
from public.procurement_requests r
left join public.departments d on d.id = r.department_id
left join public.profiles p on p.id = r.requester_id;

create or replace view public.payment_request_list
with (security_invoker = true) as
select p.id, p.payment_no, p.total_amount, p.status, p.current_step, p.created_at,
  coalesce(nullif(p.form_data->>'subject', ''), r.request_no, '') as subject,
  coalesce(nullif(u.full_name, ''), p.form_data->>'requesterName', '') as requester_name,
  coalesce(p.form_data->>'departmentName', '') as department_name,
  coalesce(r.request_no, '') as source_no,
  concat_ws(' ', p.payment_no, r.request_no,
    coalesce(nullif(p.form_data->>'subject', ''), r.request_no, ''),
    coalesce(nullif(u.full_name, ''), p.form_data->>'requesterName', ''),
    p.form_data->>'departmentName') as search_text
from public.payment_requests p
left join public.procurement_requests r on r.id = p.procurement_request_id
left join public.profiles u on u.id = p.requester_id;

revoke all on public.procurement_request_list, public.payment_request_list from public, anon, authenticated;
grant select on public.procurement_request_list, public.payment_request_list to authenticated;

create index if not exists procurement_requests_list_order_idx
  on public.procurement_requests (created_at desc, id desc);
create index if not exists payment_requests_list_order_idx
  on public.payment_requests (created_at desc, id desc);
create index if not exists workflow_tasks_pending_request_due_idx
  on public.workflow_tasks (request_id, due_at) where status = 'pending';

notify pgrst, 'reload schema';
commit;
