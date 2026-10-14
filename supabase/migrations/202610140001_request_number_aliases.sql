-- Compatibility stage: apply before deploying the alias-aware application.
-- This stage does NOT renumber any request.
begin;

create table if not exists public.request_number_aliases (
  old_request_no text primary key,
  request_id uuid not null references public.procurement_requests(id) on delete restrict,
  changed_at timestamptz not null default now(),
  reason text not null
);
create index if not exists request_number_aliases_request_idx
  on public.request_number_aliases(request_id);
alter table public.request_number_aliases enable row level security;
drop policy if exists request_number_aliases_read on public.request_number_aliases;
create policy request_number_aliases_read on public.request_number_aliases
  for select to authenticated
  using (private.can_read_request(request_id));
revoke all on public.request_number_aliases from public, anon, authenticated;
grant select on public.request_number_aliases to authenticated;

-- Invoker rights: resolving an old number must not disclose an inaccessible request.
create or replace function public.resolve_procurement_request_number(lookup_no text)
returns table(request_id uuid, request_no text, previous_request_nos text[])
language sql stable security invoker set search_path = '' as $$
  select r.id, r.request_no,
    array(select a.old_request_no from public.request_number_aliases a
      where a.request_id = r.id order by a.changed_at, a.old_request_no)
  from public.procurement_requests r
  where r.request_no = lookup_no or exists (
    select 1 from public.request_number_aliases a
    where a.old_request_no = lookup_no and a.request_id = r.id
  );
$$;
revoke all on function public.resolve_procurement_request_number(text) from public, anon;
grant execute on function public.resolve_procurement_request_number(text) to authenticated;

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
  concat_ws(' ', r.request_no, r.title, d.name_th,
    (select string_agg(a.old_request_no, ' ') from public.request_number_aliases a
      where a.request_id = r.id)) as search_text
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
    p.form_data->>'departmentName',
    (select string_agg(a.old_request_no, ' ') from public.request_number_aliases a
      where a.request_id = r.id)) as search_text
from public.payment_requests p
left join public.procurement_requests r on r.id = p.procurement_request_id
left join public.profiles u on u.id = p.requester_id;

notify pgrst, 'reload schema';
commit;
