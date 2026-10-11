import { describe, it, expect } from "vitest";
import { csvCell } from "../../app/lib/csv";
import {
  savedPaymentPrintData,
  restorePayment,
  paymentHref,
  type PaymentRecord,
} from "../../app/payments/payment-model";
import { readFileSync } from "node:fs";

describe("safe CSV cells", () => {
  it.each(["=HYPERLINK(1)", "+cmd", "-cmd", "@SUM(A1)", "  =cmd", "\t=cmd", "\ntext"])(
    "neutralizes %j",
    (value) => expect(csvCell(value)).toContain("'"),
  );
  it("preserves Thai and escapes quotes", () => expect(csvCell('หน่วย "ก"')).toBe('"หน่วย ""ก"""'));
});
const payment: PaymentRecord = {
  id: "11111111-1111-4111-8111-111111111111",
  payment_no: "PV-1",
  requester_id: "owner",
  procurement_request_id: "source",
  status: "returned",
  current_step: 4,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-02T00:00:00Z",
  submitted_at: "2026-10-02T00:00:00Z",
  invoice_no: "INV-1",
  invoice_date: "2026-10-01",
  subtotal: 200,
  vat_amount: 14,
  total_amount: 214,
  delivery_detail: "ครบถ้วน",
  idempotency_key: null,
  form_data: {
    formType: "pol02",
    formVersion: 1,
    subject: "ทดสอบ",
    requesterName: "ผู้ทดสอบ",
    departmentName: "คณะรัฐศาสตร์",
    approvalDate: "2026-09-01",
    budgetYear: 2570,
    contractAmount: 1000,
    documentChecklist: ["delivery_invoice"],
  },
  payment_items: [
    {
      line_no: 1,
      description: "รายการจริง",
      quantity: 2,
      unit_price: 100,
      attachment_type: "invoice",
      document_no: "INV-1",
    },
  ],
  payment_attachments: [],
  payment_workflow_actions: [],
  payment_workflow_tasks: [],
  procurement_requests: {
    request_no: "POL01-1",
    title: "ต้นทาง",
    estimated_amount: 1000,
    plan_name: "แผนเดิม",
  },
};
describe("saved POL02 restoration", () => {
  it("preserves stored values and document date instead of replacing with today", () => {
    expect(restorePayment(payment).details.invoiceNo).toBe("INV-1");
    const data = savedPaymentPrintData(payment);
    expect(data.total).toBe(214);
    expect(data.items[0].description).toBe("รายการจริง");
    expect(data.documentDate).toContain("2569");
    expect(data.documentDate).toContain("2");
    expect(data.source.requestNo).toBe("POL01-1");
    expect(data.balanceRecorded).toBe(false);
    expect(data.savedIdentity).toEqual({ paymentNo: "PV-1", statusLabel: "ส่งกลับแก้ไข" });
  });
  it("prints the server-recorded balance instead of inventing zero past payments", () => {
    const saved = {
      ...payment,
      form_data: {
        ...(payment.form_data as object),
        balanceAtSubmission: { approved: 900, paid: 450 },
      },
    };
    expect(savedPaymentPrintData(saved).source.paid).toBe(450);
    expect(savedPaymentPrintData(saved).source.approved).toBe(900);
    expect(savedPaymentPrintData(saved).balanceRecorded).toBe(true);
  });
  it("escapes path segments", () => expect(paymentHref("PV/1")).toBe("/payments/PV%2F1"));
});
describe("migration safety contracts", () => {
  const sql = readFileSync("supabase/migrations/202610110003_payment_revision_flow.sql", "utf8");
  it("locks owner revisions, guards stale writes and retains originals", () => {
    expect(sql).toContain("for update");
    expect(sql).toContain("existing_payment.requester_id <> current_profile.id");
    expect(sql).toContain("existing_payment.updated_at <> expected_updated_at");
    expect(sql).toContain("public.payment_revisions");
    expect(sql).not.toMatch(/delete from storage\.objects/i);
    expect(sql).toContain("enable row level security");
  });
  it("returns to the original workflow step and rechecks limits", () => {
    expect(sql).toContain("step_no = current_payment.current_step");
    expect(sql).toContain("on conflict (payment_request_id, step_no)");
    expect(sql).toContain("payment amount exceeds remaining request amount");
    expect(sql).toContain("decision reason required");
  });
});
