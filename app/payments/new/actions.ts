"use server";

import { createClient } from "@/lib/supabase/server";
import { toSafeActionError } from "@/lib/server/action-errors";
import { paymentInputSchema, type PaymentInput } from "./schemas";

export async function createPaymentDraft(input: PaymentInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบใหม่", paymentId: null, paymentNo: null };

  const parsedInput = paymentInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return {
      error: "กรุณากรอกข้อมูลคำขอเบิกจ่ายให้ครบถ้วน",
      paymentId: null,
      paymentNo: null,
    };
  }

  const payment = parsedInput.data;
  const { data, error } = await supabase.rpc("create_payment_request_draft", {
    source_request_id: payment.requestId,
    payment_idempotency_key: payment.idempotencyKey,
    payment_invoice_no: payment.invoiceNo,
    payment_invoice_date: payment.invoiceDate,
    payment_subtotal: payment.subtotal,
    payment_vat_amount: payment.vat,
    payment_delivery_detail: payment.delivery,
    payment_form_data: payment.formData,
    payment_items: payment.items,
  });
  if (error) {
    return {
      error: toSafeActionError("submit-payment", error, "ไม่สามารถส่งคำขอเบิกจ่ายได้ กรุณาลองใหม่"),
      paymentId: null,
      paymentNo: null,
    };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    error: null,
    paymentId: row?.id as string | undefined,
    paymentNo: row?.payment_no as string | undefined,
  };
}

export async function submitPaymentDraft(paymentId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบใหม่", paymentNo: null };

  const parsedPaymentId = paymentInputSchema.shape.requestId.safeParse(paymentId);
  if (!parsedPaymentId.success) {
    return { error: "ไม่พบฉบับร่างคำขอเบิกจ่าย", paymentNo: null };
  }

  const { data, error } = await supabase.rpc("submit_payment_request_draft", {
    target_payment_id: parsedPaymentId.data,
  });
  if (error) {
    return {
      error: toSafeActionError(
        "submit-payment-draft",
        error,
        "ไม่สามารถส่งคำขอเบิกจ่ายเข้าสู่สายอนุมัติได้ กรุณาลองใหม่",
      ),
      paymentNo: null,
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return { error: null, paymentNo: row?.payment_no as string | undefined };
}
