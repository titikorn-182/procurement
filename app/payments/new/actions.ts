"use server";

import { createClient } from "@/lib/supabase/server";
import { toSafeActionError } from "@/lib/server/action-errors";
import { paymentInputSchema, type PaymentInput } from "./schemas";

export async function submitPayment(input: PaymentInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบใหม่", paymentNo: null };

  const parsedInput = paymentInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return { error: "กรุณากรอกข้อมูลคำขอเบิกจ่ายให้ครบถ้วน", paymentNo: null };
  }

  const payment = parsedInput.data;
  const { data, error } = await supabase.rpc("submit_payment_request", {
    source_request_id: payment.requestId,
    payment_idempotency_key: payment.idempotencyKey,
    payment_invoice_no: payment.invoiceNo,
    payment_invoice_date: payment.invoiceDate,
    payment_subtotal: payment.subtotal,
    payment_vat_amount: payment.vat,
    payment_delivery_detail: payment.delivery,
  });
  if (error) {
    return {
      error: toSafeActionError("submit-payment", error, "ไม่สามารถส่งคำขอเบิกจ่ายได้ กรุณาลองใหม่"),
      paymentNo: null,
    };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return { error: null, paymentNo: row?.payment_no as string | undefined };
}
