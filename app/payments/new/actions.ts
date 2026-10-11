"use server";

import { createClient } from "@/lib/supabase/server";
import { toSafeActionError } from "@/lib/server/action-errors";
import { paymentInputSchema, type PaymentInput } from "./schemas";
import { z } from "zod";
import { revalidatePath } from "next/cache";

export async function createPaymentDraft(
  input: PaymentInput,
  revision?: { id: string; updatedAt: string; removedAttachmentIds: string[] },
) {
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
  const parsedRevision = z
    .object({
      id: z.string().uuid(),
      updatedAt: z.string().datetime({ offset: true }),
      removedAttachmentIds: z.array(z.string().uuid()).max(10),
    })
    .strict()
    .safeParse(revision);
  if (revision && !parsedRevision.success)
    return {
      error: "ข้อมูลฉบับแก้ไขไม่ถูกต้อง กรุณาโหลดหน้าใหม่",
      paymentId: null,
      paymentNo: null,
    };
  const { data, error } = await supabase.rpc(
    revision ? "save_payment_request_revision" : "create_payment_request_draft",
    {
      ...(parsedRevision.success
        ? {
            target_payment_id: parsedRevision.data.id,
            expected_updated_at: parsedRevision.data.updatedAt,
            removed_attachment_ids: parsedRevision.data.removedAttachmentIds,
          }
        : {}),
      source_request_id: payment.requestId,
      payment_idempotency_key: payment.idempotencyKey,
      payment_invoice_no: payment.invoiceNo,
      payment_invoice_date: payment.invoiceDate,
      payment_subtotal: payment.subtotal,
      payment_vat_amount: payment.vat,
      payment_delivery_detail: payment.delivery,
      payment_form_data: payment.formData,
      payment_items: payment.items,
    },
  );
  if (error) {
    return {
      error: error.message.includes("revision conflict")
        ? "ข้อมูลถูกแก้ไขจากหน้าต่างอื่นแล้ว กรุณาโหลดหน้าใหม่ก่อนบันทึก"
        : toSafeActionError(
            "submit-payment",
            error,
            "ไม่สามารถบันทึกคำขอได้ กรุณาลองใหม่ หากยังพบปัญหาให้ผู้ดูแลตรวจสอบ migration ล่าสุด",
          ),
      paymentId: null,
      paymentNo: null,
    };
  }
  const row = Array.isArray(data) ? data[0] : data;
  const { data: saved } = row?.id
    ? await supabase.from("payment_requests").select("updated_at").eq("id", row.id).single()
    : { data: null };
  revalidatePath("/payments");
  if (row?.payment_no) revalidatePath(`/payments/${encodeURIComponent(row.payment_no)}`);
  return {
    error: null,
    paymentId: row?.id as string | undefined,
    paymentNo: row?.payment_no as string | undefined,
    updatedAt: (row?.updated_at ?? saved?.updated_at) as string | undefined,
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
  for (const path of ["/", "/payments", "/tasks", "/activity"]) revalidatePath(path);
  if (row?.payment_no) revalidatePath(`/payments/${encodeURIComponent(row.payment_no)}`);
  return { error: null, paymentNo: row?.payment_no as string | undefined };
}
