begin;

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
  if coalesce((new.form_data->>'requiresLoanAgreement')::boolean, false) then
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

drop trigger if exists validate_request_submission_attachments on public.procurement_requests;
create trigger validate_request_submission_attachments
before update of status on public.procurement_requests
for each row
when (old.status = 'draft' and new.status = 'submitted')
execute procedure public.validate_request_submission_attachments();

commit;
