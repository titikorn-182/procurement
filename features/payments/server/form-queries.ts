import "server-only";
import { createClient } from "@/lib/supabase/server";
import { toSafeActionError } from "@/lib/server/action-errors";
import { getPayment, getPaymentAccess } from "./queries";
import { record, restorePayment } from "../model";
import { pol02SupportingChecklistSchema } from "@/app/payments/new/pol02-checklist-schema";
import type { PaymentEditData } from "../types";
import { toPaymentSource } from "../mappers";
export async function getPayableSources() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("procurement_requests")
    .select(
      "id, request_no, title, rationale, budget_year, fund_source, plan_name, expense_category, estimated_amount, status, completed_at, form_data, departments(name_th), profiles!procurement_requests_requester_id_fkey(full_name), request_items(line_no,description,quantity,unit_price), payment_requests(total_amount,status)",
    )
    .in("status", ["approved", "ordered", "completed"])
    .order("created_at", { ascending: false });
  const safeError = error
    ? toSafeActionError("get-payable-requests", error, "ไม่สามารถโหลดคำขอที่เบิกจ่ายได้")
    : null;

  return { requests: (data ?? []).map(toPaymentSource), error: safeError };
}
export async function getPaymentForEditing(id: string) {
  const { data: payment, error } = await getPayment(id);
  if (!payment && !error) return { kind: "not_found" as const };
  if (!payment) throw new Error("payment unavailable");
  const { owner } = await getPaymentAccess(payment),
    form = record(payment.form_data);
  if (
    !owner ||
    (payment.status !== "draft" && payment.status !== "returned") ||
    form.formType !== "pol02"
  )
    return { kind: "forbidden" as const };
  const supabase = await createClient();
  const { data: otherPayments, error: balanceError } = await supabase
    .from("payment_requests")
    .select("total_amount")
    .eq("procurement_request_id", payment.procurement_request_id)
    .neq("id", payment.id)
    .not("status", "in", "(cancelled,draft)");
  if (balanceError) throw new Error("payment balance unavailable");
  const { source, details, lines } = restorePayment(payment);
  source.paid = (otherPayments ?? []).reduce((sum, row) => sum + Number(row.total_amount), 0);
  const checklist = pol02SupportingChecklistSchema.safeParse(form.supportingDocumentChecklist);

  const initial: PaymentEditData = {
    status: payment.status,
    currentStep: payment.current_step,
    id: payment.id,
    paymentNo: payment.payment_no,
    updatedAt: payment.updated_at,
    idempotencyKey: payment.idempotency_key ?? payment.id,
    details,
    lines,
    checklist: checklist.success ? checklist.data : undefined,
    attachments: payment.payment_attachments,
  };
  return { kind: "ready" as const, paymentNo: payment.payment_no, source, initial };
}
