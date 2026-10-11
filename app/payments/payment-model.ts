import { createPol02PrintData } from "./new/pol02-print-data";
import type { PaymentDetails, PaymentLine, SourceRequest } from "./new/types";
import { pol02SupportingChecklistSchema } from "./new/pol02-checklist-schema";
import type { Tables } from "@/lib/supabase/database.types";

export const paymentStatusLabels: Record<string, string> = {
  draft: "ฉบับร่าง",
  submitted: "ส่งคำขอแล้ว",
  under_review: "อยู่ระหว่างพิจารณา",
  returned: "ส่งกลับแก้ไข",
  approved: "อนุมัติแล้ว",
  voucher_submitted: "ส่งวางฎีกาแล้ว",
  completed: "เสร็จสิ้น",
  cancelled: "ยุติคำขอ",
};
export const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
export const text = (value: unknown) => (typeof value === "string" ? value : "");
export const paymentHref = (number: string) => `/payments/${encodeURIComponent(number)}`;
export const dateText = (value: string | null) =>
  value && !Number.isNaN(Date.parse(value))
    ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(
        new Date(value),
      )
    : "—";
export const money = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export type PaymentAttachment = Pick<
  Tables<"payment_attachments">,
  "id" | "file_name" | "mime_type" | "size_bytes" | "created_at"
>;
export type PaymentRecord = Tables<"payment_requests"> & {
  payment_items: Array<
    Pick<
      Tables<"payment_items">,
      "line_no" | "description" | "attachment_type" | "document_no" | "quantity" | "unit_price"
    >
  >;
  payment_attachments: PaymentAttachment[];
  payment_workflow_tasks: Array<
    Pick<
      Tables<"payment_workflow_tasks">,
      "id" | "step_no" | "step_name" | "required_role" | "assignee_id" | "status" | "due_at"
    >
  >;
  payment_workflow_actions: Array<
    Pick<Tables<"payment_workflow_actions">, "id" | "action" | "comment" | "created_at"> & {
      profiles: Pick<Tables<"profiles">, "full_name"> | null;
    }
  >;
  procurement_requests: Pick<
    Tables<"procurement_requests">,
    "request_no" | "title" | "estimated_amount" | "plan_name"
  > | null;
};

export function restorePayment(payment: PaymentRecord) {
  const form = record(payment.form_data);
  const source: SourceRequest = {
    id: payment.procurement_request_id,
    requestNo: payment.procurement_requests?.request_no ?? "",
    title: text(form.subject),
    rationale: payment.delivery_detail,
    requesterName: text(form.requesterName),
    departmentName: text(form.departmentName),
    budgetYear: Number(form.budgetYear),
    fundSource: text(form.fundSource),
    planName: payment.procurement_requests?.plan_name ?? "",
    expenseCategory: text(form.expenseCategory),
    approvedDate: text(form.approvalDate),
    approved: Number(payment.procurement_requests?.estimated_amount ?? form.contractAmount),
    paid: 0,
    vendorName: text(form.vendorName),
    departmentCode: text(form.departmentCode),
    fundCode: text(form.fundCode),
    activityCode: text(form.activityCode),
    items: [],
  };
  const details: PaymentDetails = {
    approvalDate: text(form.approvalDate),
    subject: text(form.subject),
    projectActivity: text(form.projectActivity),
    procurementMethod: text(form.procurementMethod),
    egpProjectNo: text(form.egpProjectNo),
    contractNo: text(form.contractNo),
    contractDate: text(form.contractDate),
    vendorName: text(form.vendorName),
    vendorTaxId: text(form.vendorTaxId),
    contractAmount: String(form.contractAmount ?? ""),
    installmentNumber: String(form.installmentNumber ?? 1),
    installmentCount: String(form.installmentCount ?? 1),
    invoiceNo: payment.invoice_no,
    invoiceDate: payment.invoice_date,
    vat: String(payment.vat_amount),
    delivery: payment.delivery_detail,
  };
  const lines: PaymentLine[] = [...payment.payment_items]
    .sort((a, b) => a.line_no - b.line_no)
    .map((item) => ({
      id: String(item.line_no),
      description: item.description,
      attachmentType: item.attachment_type,
      documentNo: item.document_no ?? "",
      quantity: String(item.quantity),
      unitPrice: String(item.unit_price),
    }));
  return { source, details, lines };
}

export function savedPaymentPrintData(payment: PaymentRecord) {
  const { source, details, lines } = restorePayment(payment);
  const form = record(payment.form_data);
  const balance = record(form.balanceAtSubmission);
  const balanceRecorded = typeof balance.approved === "number" && typeof balance.paid === "number";
  if (typeof balance.approved === "number" && typeof balance.paid === "number") {
    source.approved = balance.approved;
    source.paid = balance.paid;
  }
  return {
    ...createPol02PrintData({
      request: source,
      details,
      lines,
      selectedDocuments: Array.isArray(form.documentChecklist)
        ? form.documentChecklist.filter((v): v is string => typeof v === "string")
        : [],
      supportingDocumentChecklist: form.supportingDocumentChecklist
        ? pol02SupportingChecklistSchema.parse(form.supportingDocumentChecklist)
        : undefined,
      attachmentNames: payment.payment_attachments.map((file) => file.file_name),
      date: new Date(payment.submitted_at ?? payment.created_at),
    }),
    balanceRecorded,
    savedIdentity: {
      paymentNo: payment.payment_no,
      statusLabel: paymentStatusLabels[payment.status] ?? payment.status,
    },
  };
}
