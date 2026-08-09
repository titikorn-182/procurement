begin;

create or replace function public.submit_payment_request(
  source_request_id uuid,
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
  new_payment public.payment_requests%rowtype;
  already_requested numeric(14,2);
begin
  select * into current_profile from public.profiles where profiles.id = (select auth.uid()) and profiles.active = true;
  if current_profile.id is null then raise exception 'ไม่พบโปรไฟล์ผู้ใช้งานหรือบัญชีถูกระงับ'; end if;

  select * into source_request from public.procurement_requests where procurement_requests.id = source_request_id;
  if source_request.id is null then raise exception 'ไม่พบคำขอจัดซื้อจัดจ้างต้นทาง'; end if;
  if source_request.requester_id <> current_profile.id and not private.is_privileged() then raise exception 'ไม่มีสิทธิ์สร้างคำขอเบิกจ่ายสำหรับรายการนี้'; end if;
  if source_request.status not in ('approved','ordered','completed') then raise exception 'คำขอต้นทางยังไม่อยู่ในสถานะที่เบิกจ่ายได้'; end if;
  if trim(payment_invoice_no) = '' or trim(payment_delivery_detail) = '' then raise exception 'ข้อมูลใบแจ้งหนี้หรือการส่งมอบไม่ครบถ้วน'; end if;
  if payment_subtotal < 0 or payment_vat_amount < 0 then raise exception 'จำนวนเงินไม่ถูกต้อง'; end if;

  select coalesce(sum(total_amount),0) into already_requested
  from public.payment_requests
  where procurement_request_id = source_request.id and status <> 'cancelled';
  if already_requested + payment_subtotal + payment_vat_amount > source_request.estimated_amount then
    raise exception 'ยอดเบิกจ่ายสูงกว่าวงเงินคงเหลือ';
  end if;

  insert into public.payment_requests (
    procurement_request_id, requester_id, invoice_no, invoice_date,
    subtotal, vat_amount, delivery_detail, status, current_step, submitted_at
  ) values (
    source_request.id, current_profile.id, trim(payment_invoice_no), payment_invoice_date,
    payment_subtotal, payment_vat_amount, trim(payment_delivery_detail), 'submitted', 2, now()
  ) returning * into new_payment;

  return query select new_payment.id, new_payment.payment_no;
end;
$$;

revoke all on function public.submit_payment_request(uuid,text,date,numeric,numeric,text) from public;
grant execute on function public.submit_payment_request(uuid,text,date,numeric,numeric,text) to authenticated;

commit;
