begin;

create or replace function public.protect_request_workflow_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_owner_draft_submission boolean;
begin
  is_owner_draft_submission := coalesce(
    old.requester_id = (select auth.uid())
    and new.requester_id = old.requester_id
    and new.department_id = old.department_id
    and old.status = 'draft'
    and new.status = 'submitted'
    and old.current_step = 1
    and new.submitted_at is not null
    and new.completed_at is not distinct from old.completed_at
    and exists (
      select 1
      from private.procurement_workflow_steps step
      where step.step_no = new.current_step
        and step.step_no = (
          select min(first_step.step_no) from private.procurement_workflow_steps first_step
        )
    ),
    false
  );

  if not private.is_privileged()
    and not is_owner_draft_submission
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

commit;
