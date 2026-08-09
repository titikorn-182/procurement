"use server";

import { createClient } from "@/lib/supabase/server";

export async function submitPayment(input: { requestId: string; invoiceNo: string; invoiceDate: string; subtotal: number; vat: number; delivery: string }) {
  if (!/^[0-9a-f-]{36}$/i.test(input.requestId) || !input.invoiceNo.trim() || !input.invoiceDate || !input.delivery.trim() || input.subtotal < 0 || input.vat < 0) return { error: "กรุณากรอกข้อมูลคำขอเบิกจ่ายให้ครบถ้วน", paymentNo: null };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบใหม่", paymentNo: null };
  const { data, error } = await supabase.rpc("submit_payment_request", { source_request_id: input.requestId, payment_invoice_no: input.invoiceNo, payment_invoice_date: input.invoiceDate, payment_subtotal: input.subtotal, payment_vat_amount: input.vat, payment_delivery_detail: input.delivery });
  if (error) return { error: error.message, paymentNo: null };
  const row = Array.isArray(data) ? data[0] : data;
  return { error: null, paymentNo: row?.payment_no as string | undefined };
}
