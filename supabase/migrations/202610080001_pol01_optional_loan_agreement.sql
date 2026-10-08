begin;

-- POL-01 loan agreements are optional. Ignore the legacy required flag for
-- standard requests without rewriting saved form data or deleting attachments.
-- Keep vendor documents, W119 requirements, ownership and storage checks intact.
create or replace function public.submit_procurement_request_draft(target_request_id uuid)
returns table(request_no text, status public.request_status, current_step smallint)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_profile public.profiles%rowtype;
  current_request public.procurement_requests%rowtype;
  first_step private.procurement_workflow_steps%rowtype;
  attachment_count integer;
  required_attachment_count integer := 0;
begin
  select * into current_profile
  from public.profiles
  where profiles.id = (select auth.uid()) and profiles.active = true;

  if current_profile.id is null then raise exception 'active profile required'; end if;
  if not private.has_permission('request.create') then
    raise exception 'request creation permission required';
  end if;

  select * into current_request
  from public.procurement_requests
  where procurement_requests.id = target_request_id
  for update;

  if current_request.id is null then raise exception 'request not found'; end if;
  if current_request.requester_id <> current_profile.id then raise exception 'request owner required'; end if;
  if current_request.status <> 'draft' then raise exception 'request is not a draft'; end if;
  if not exists (
    select 1 from public.request_items where request_items.request_id = current_request.id
  ) then
    raise exception 'request items required';
  end if;

  if (current_request.form_data->>'formType') is distinct from 'standard'
    and coalesce((current_request.form_data->>'requiresLoanAgreement')::boolean, false) then
    required_attachment_count := required_attachment_count + 1;
  end if;
  if coalesce((current_request.form_data->>'requiresVendorDocuments')::boolean, false) then
    required_attachment_count := required_attachment_count + 1;
  end if;

  select count(*) into attachment_count
  from public.request_attachments
  where request_attachments.request_id = current_request.id;

  if attachment_count > 10 then raise exception 'too many attachments'; end if;

  if attachment_count < required_attachment_count then
    raise exception 'required attachment missing';
  end if;

  if exists (
    select 1
    from public.request_attachments attachment
    left join storage.objects object
      on object.bucket_id = 'procurement-documents'
      and object.name = attachment.storage_path
    where attachment.request_id = current_request.id
      and object.id is null
  ) then
    raise exception 'attachment object missing';
  end if;

  select * into first_step
  from private.procurement_workflow_steps
  order by step_no
  limit 1;
  if first_step.step_no is null then raise exception 'workflow is not configured'; end if;

  insert into public.workflow_tasks (request_id, step_no, step_name, required_role, due_at)
  values (
    current_request.id,
    first_step.step_no,
    first_step.step_name,
    first_step.required_role,
    now() + make_interval(days => first_step.due_days)
  );

  insert into public.workflow_actions (request_id, actor_id, action, comment, metadata)
  values (
    current_request.id,
    current_profile.id,
    'submit',
    'ยื่นคำขอเข้าสู่กระบวนการ',
    jsonb_build_object(
      'formType', current_request.form_data->>'formType',
      'formVersion', current_request.form_data->>'formVersion',
      'attachmentCount', attachment_count
    )
  );

  update public.procurement_requests
  set status = 'submitted',
    current_step = first_step.step_no,
    submitted_at = now(),
    updated_at = now()
  where procurement_requests.id = current_request.id
  returning * into current_request;

  return query select
    current_request.request_no,
    current_request.status,
    current_request.current_step;
end;
$$;

revoke all on function public.submit_procurement_request_draft(uuid) from public;
grant execute on function public.submit_procurement_request_draft(uuid) to authenticated;

-- The existing trigger covers both draft submission and returned resubmission.
create or replace function public.validate_request_submission_attachments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  attachment_count integer;
  required_attachment_count integer := 0;
begin
  if (new.form_data->>'formType') is distinct from 'standard'
    and coalesce((new.form_data->>'requiresLoanAgreement')::boolean, false) then
    required_attachment_count := required_attachment_count + 1;
  end if;
  if coalesce((new.form_data->>'requiresVendorDocuments')::boolean, false) then
    required_attachment_count := required_attachment_count + 1;
  end if;
  if new.form_data->>'formType' = 'w119' then
    required_attachment_count := greatest(required_attachment_count, 1);
  end if;

  select count(*) into attachment_count
  from public.request_attachments attachment
  where attachment.request_id = new.id;

  if attachment_count > 10 then raise exception 'too many attachments'; end if;
  if attachment_count < required_attachment_count then
    raise exception 'required attachment missing';
  end if;

  if exists (
    select 1
    from public.request_attachments attachment
    left join storage.objects object
      on object.bucket_id = 'procurement-documents'
      and object.name = attachment.storage_path
    where attachment.request_id = new.id
      and object.id is null
  ) then
    raise exception 'attachment object missing';
  end if;

  return new;
end;
$$;

commit;
