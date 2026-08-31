begin;

create table if not exists private.role_permissions (
  role public.app_role not null,
  permission text not null check (permission ~ '^[a-z_]+\.[a-z_]+$'),
  primary key (role, permission)
);

revoke all on table private.role_permissions from public, anon, authenticated;

insert into private.role_permissions (role, permission) values
  ('user', 'request.create'),
  ('user', 'request.read_own'),
  ('user', 'payment.create'),
  ('user', 'payment.read_own'),
  ('procurement_staff', 'request.create'),
  ('procurement_staff', 'request.read_assigned'),
  ('procurement_staff', 'request.review'),
  ('procurement_staff', 'payment.create'),
  ('procurement_staff', 'payment.read_all'),
  ('procurement_staff', 'payment.review'),
  ('finance_staff', 'request.create'),
  ('finance_staff', 'request.read_assigned'),
  ('finance_staff', 'request.budget_control'),
  ('finance_staff', 'payment.create'),
  ('finance_staff', 'payment.read_all'),
  ('finance_staff', 'payment.review'),
  ('head_procurement', 'request.create'),
  ('head_procurement', 'request.read_assigned'),
  ('head_procurement', 'request.approve'),
  ('head_procurement', 'payment.create'),
  ('head_procurement', 'payment.read_all'),
  ('head_procurement', 'payment.approve'),
  ('deputy_secretary', 'request.create'),
  ('deputy_secretary', 'request.read_assigned'),
  ('deputy_secretary', 'request.approve'),
  ('deputy_secretary', 'payment.create'),
  ('deputy_secretary', 'payment.read_own'),
  ('deputy_finance', 'request.create'),
  ('deputy_finance', 'request.read_assigned'),
  ('deputy_finance', 'request.approve'),
  ('deputy_finance', 'payment.create'),
  ('deputy_finance', 'payment.read_all'),
  ('deputy_finance', 'payment.approve'),
  ('dean', 'request.create'),
  ('dean', 'request.read_assigned'),
  ('dean', 'request.approve'),
  ('dean', 'payment.create'),
  ('dean', 'payment.read_all'),
  ('dean', 'payment.approve'),
  ('head_office', 'request.create'),
  ('head_office', 'request.read_assigned'),
  ('head_office', 'request.approve'),
  ('head_office', 'payment.create'),
  ('head_office', 'payment.read_all'),
  ('head_office', 'payment.approve'),
  ('admin', 'request.create'),
  ('admin', 'request.read_all'),
  ('admin', 'request.transition_all'),
  ('admin', 'payment.create'),
  ('admin', 'payment.read_all'),
  ('admin', 'payment.transition_all'),
  ('admin', 'profile.read_all'),
  ('admin', 'system.manage')
on conflict (role, permission) do nothing;

create or replace function private.has_permission(required_permission text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(exists (
    select 1
    from private.role_permissions rp
    join public.profiles p on p.role = rp.role
    where p.id = (select auth.uid())
      and p.active = true
      and rp.permission = required_permission
  ), false)
$$;

create or replace function private.can_read_request(target_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    exists (
      select 1
      from public.procurement_requests r
      where r.id = target_request_id
        and r.requester_id = (select auth.uid())
    )
    or private.has_permission('request.read_all')
    or exists (
      select 1
      from public.workflow_tasks t
      join public.profiles p on p.id = (select auth.uid()) and p.active = true
      where t.request_id = target_request_id
        and t.status = 'pending'
        and (t.assignee_id = p.id or (t.assignee_id is null and t.required_role = p.role))
    ),
    false
  )
$$;

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
    or private.has_permission('payment.read_all'),
    false
  )
$$;

create or replace function private.can_read_profile(target_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    target_profile_id = (select auth.uid())
    or private.has_permission('profile.read_all')
    or exists (
      select 1
      from public.procurement_requests r
      where r.requester_id = target_profile_id
        and private.can_read_request(r.id)
    )
    or exists (
      select 1
      from public.workflow_actions a
      where a.actor_id = target_profile_id
        and private.can_read_request(a.request_id)
    ),
    false
  )
$$;

create or replace function private.can_mutate_request_attachments(target_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(exists (
    select 1
    from public.procurement_requests r
    where r.id = target_request_id
      and r.requester_id = (select auth.uid())
      and r.status in ('draft', 'returned')
  ), false)
$$;

create or replace function private.can_mutate_payment_attachments(target_payment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(exists (
    select 1
    from public.payment_requests p
    where p.id = target_payment_id
      and p.requester_id = (select auth.uid())
      and p.status in ('draft', 'returned')
  ), false)
$$;

create or replace function private.document_path_entity_id(object_name text, entity_prefix text)
returns uuid
language plpgsql
immutable
security definer
set search_path = ''
as $$
declare
  raw_id text;
begin
  if split_part(object_name, '/', 1) <> entity_prefix then
    return null;
  end if;
  raw_id := split_part(object_name, '/', 2);
  if raw_id !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
    return null;
  end if;
  return raw_id::uuid;
end;
$$;

create or replace function private.can_read_document_path(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  entity_id uuid;
begin
  entity_id := private.document_path_entity_id(object_name, 'requests');
  if entity_id is not null then return private.can_read_request(entity_id); end if;
  entity_id := private.document_path_entity_id(object_name, 'payments');
  if entity_id is not null then return private.can_read_payment(entity_id); end if;
  return false;
end;
$$;

create or replace function private.can_mutate_document_path(object_name text)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  entity_id uuid;
begin
  entity_id := private.document_path_entity_id(object_name, 'requests');
  if entity_id is not null then return private.can_mutate_request_attachments(entity_id); end if;
  entity_id := private.document_path_entity_id(object_name, 'payments');
  if entity_id is not null then return private.can_mutate_payment_attachments(entity_id); end if;
  return false;
end;
$$;

grant usage on schema private to authenticated;
revoke all on function private.has_permission(text) from public;
revoke all on function private.can_read_request(uuid) from public;
revoke all on function private.can_read_payment(uuid) from public;
revoke all on function private.can_read_profile(uuid) from public;
revoke all on function private.can_mutate_request_attachments(uuid) from public;
revoke all on function private.can_mutate_payment_attachments(uuid) from public;
revoke all on function private.document_path_entity_id(text, text) from public;
revoke all on function private.can_read_document_path(text) from public;
revoke all on function private.can_mutate_document_path(text) from public;
grant execute on function private.has_permission(text) to authenticated;
grant execute on function private.can_read_request(uuid) to authenticated;
grant execute on function private.can_read_payment(uuid) to authenticated;
grant execute on function private.can_read_profile(uuid) to authenticated;
grant execute on function private.can_mutate_request_attachments(uuid) to authenticated;
grant execute on function private.can_mutate_payment_attachments(uuid) to authenticated;
grant execute on function private.can_read_document_path(text) to authenticated;
grant execute on function private.can_mutate_document_path(text) to authenticated;

drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
using (private.can_read_profile(id));

drop policy if exists requests_read on public.procurement_requests;
drop policy if exists requests_insert on public.procurement_requests;
drop policy if exists requests_owner_update_draft on public.procurement_requests;
drop policy if exists requests_staff_update on public.procurement_requests;
create policy requests_read on public.procurement_requests for select to authenticated
using (private.can_read_request(id));

drop policy if exists items_read on public.request_items;
drop policy if exists items_owner_write on public.request_items;
create policy items_read on public.request_items for select to authenticated
using (private.can_read_request(request_id));

drop policy if exists request_files_read on public.request_attachments;
drop policy if exists request_files_owner_write on public.request_attachments;
drop policy if exists request_files_insert_draft on public.request_attachments;
drop policy if exists request_files_update_draft on public.request_attachments;
drop policy if exists request_files_delete_draft on public.request_attachments;
create policy request_files_read on public.request_attachments for select to authenticated
using (private.can_read_request(request_id));
create policy request_files_insert_draft on public.request_attachments for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and private.can_mutate_request_attachments(request_id)
);
create policy request_files_update_draft on public.request_attachments for update to authenticated
using (
  uploaded_by = (select auth.uid())
  and private.can_mutate_request_attachments(request_id)
)
with check (
  uploaded_by = (select auth.uid())
  and private.can_mutate_request_attachments(request_id)
);
create policy request_files_delete_draft on public.request_attachments for delete to authenticated
using (
  uploaded_by = (select auth.uid())
  and private.can_mutate_request_attachments(request_id)
);

drop policy if exists tasks_read on public.workflow_tasks;
drop policy if exists tasks_privileged_write on public.workflow_tasks;
create policy tasks_read on public.workflow_tasks for select to authenticated
using (private.can_read_request(request_id));

drop policy if exists actions_read on public.workflow_actions;
drop policy if exists actions_insert on public.workflow_actions;
create policy actions_read on public.workflow_actions for select to authenticated
using (private.can_read_request(request_id));

drop policy if exists payments_read on public.payment_requests;
drop policy if exists payments_insert on public.payment_requests;
drop policy if exists payments_owner_update on public.payment_requests;
drop policy if exists payments_staff_update on public.payment_requests;
create policy payments_read on public.payment_requests for select to authenticated
using (private.can_read_payment(id));

drop policy if exists payment_files_read on public.payment_attachments;
drop policy if exists payment_files_owner_write on public.payment_attachments;
drop policy if exists payment_files_insert_draft on public.payment_attachments;
drop policy if exists payment_files_update_draft on public.payment_attachments;
drop policy if exists payment_files_delete_draft on public.payment_attachments;
create policy payment_files_read on public.payment_attachments for select to authenticated
using (private.can_read_payment(payment_request_id));
create policy payment_files_insert_draft on public.payment_attachments for insert to authenticated
with check (
  uploaded_by = (select auth.uid())
  and private.can_mutate_payment_attachments(payment_request_id)
);
create policy payment_files_update_draft on public.payment_attachments for update to authenticated
using (
  uploaded_by = (select auth.uid())
  and private.can_mutate_payment_attachments(payment_request_id)
)
with check (
  uploaded_by = (select auth.uid())
  and private.can_mutate_payment_attachments(payment_request_id)
);
create policy payment_files_delete_draft on public.payment_attachments for delete to authenticated
using (
  uploaded_by = (select auth.uid())
  and private.can_mutate_payment_attachments(payment_request_id)
);

revoke insert, update, delete on public.procurement_requests from authenticated;
revoke insert, update, delete on public.request_items from authenticated;
revoke insert, update, delete on public.workflow_tasks from authenticated;
revoke insert, update, delete on public.workflow_actions from authenticated;
revoke insert, update, delete on public.payment_requests from authenticated;
grant select on public.procurement_requests, public.request_items, public.workflow_tasks,
  public.workflow_actions, public.payment_requests to authenticated;

revoke insert, update, delete on public.request_attachments from authenticated;
revoke insert, update, delete on public.payment_attachments from authenticated;
grant select, insert, update, delete on public.request_attachments, public.payment_attachments
  to authenticated;

drop policy if exists procurement_documents_read on storage.objects;
drop policy if exists procurement_documents_insert on storage.objects;
drop policy if exists procurement_documents_owner_update on storage.objects;
drop policy if exists procurement_documents_owner_delete on storage.objects;

create policy procurement_documents_read on storage.objects for select to authenticated
using (
  bucket_id = 'procurement-documents'
  and (
    owner_id = (select auth.uid())::text
    or private.can_read_document_path(name)
  )
);
create policy procurement_documents_insert on storage.objects for insert to authenticated
with check (
  bucket_id = 'procurement-documents'
  and owner_id = (select auth.uid())::text
  and private.can_mutate_document_path(name)
);
create policy procurement_documents_owner_update on storage.objects for update to authenticated
using (
  bucket_id = 'procurement-documents'
  and owner_id = (select auth.uid())::text
  and private.can_mutate_document_path(name)
)
with check (
  bucket_id = 'procurement-documents'
  and owner_id = (select auth.uid())::text
  and private.can_mutate_document_path(name)
);
create policy procurement_documents_owner_delete on storage.objects for delete to authenticated
using (
  bucket_id = 'procurement-documents'
  and owner_id = (select auth.uid())::text
  and private.can_mutate_document_path(name)
);

commit;
