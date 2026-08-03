begin;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('procurement-documents', 'procurement-documents', false, 20971520,
  array['application/pdf','image/jpeg','image/png','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy procurement_documents_read on storage.objects for select to authenticated
using (bucket_id = 'procurement-documents' and (owner_id = (select auth.uid())::text or private.is_privileged()));
create policy procurement_documents_insert on storage.objects for insert to authenticated
with check (bucket_id = 'procurement-documents' and owner_id = (select auth.uid())::text);
create policy procurement_documents_owner_update on storage.objects for update to authenticated
using (bucket_id = 'procurement-documents' and owner_id = (select auth.uid())::text)
with check (bucket_id = 'procurement-documents' and owner_id = (select auth.uid())::text);
create policy procurement_documents_owner_delete on storage.objects for delete to authenticated
using (bucket_id = 'procurement-documents' and owner_id = (select auth.uid())::text);

create function public.set_user_role(target_user_id uuid, new_role public.app_role, new_department_id uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if not private.is_admin() then raise exception 'administrator permission required'; end if;
  update public.profiles set role = new_role, department_id = coalesce(new_department_id, department_id), updated_at = now()
  where id = target_user_id;
  if not found then raise exception 'profile not found'; end if;
end;
$$;
revoke all on function public.set_user_role(uuid, public.app_role, uuid) from public;
grant execute on function public.set_user_role(uuid, public.app_role, uuid) to authenticated;

commit;
