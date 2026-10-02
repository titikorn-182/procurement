-- Keep completed procurement requests visible to the people who actually
-- participated in their workflow. This is read-only access: transitions remain
-- guarded by the current pending task inside transition_procurement_request.

create index if not exists workflow_actions_actor_request_idx
  on public.workflow_actions (actor_id, request_id);

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
    )
    or exists (
      select 1
      from public.workflow_actions a
      join public.profiles p on p.id = (select auth.uid()) and p.active = true
      where a.request_id = target_request_id
        and a.actor_id = p.id
    ),
    false
  )
$$;

revoke all on function private.can_read_request(uuid) from public;
grant execute on function private.can_read_request(uuid) to authenticated;
