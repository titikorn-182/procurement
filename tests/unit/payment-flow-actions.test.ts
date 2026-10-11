import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PaymentInput } from "../../app/payments/new/schemas";
const mock = vi.hoisted(() => ({
  user: vi.fn(),
  rpc: vi.fn(),
  single: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("../../lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mock.user },
    rpc: mock.rpc,
    from: () => {
      const q = { select: () => q, eq: () => q, single: mock.single };
      return q;
    },
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mock.revalidate }));
vi.mock("../../lib/server/action-errors", () => ({ toSafeActionError: () => "safe-error" }));
import { createPaymentDraft, submitPaymentDraft } from "../../app/payments/new/actions";
import { transitionPayment } from "../../app/payments/[id]/actions";
const id = "11111111-1111-4111-8111-111111111111";
const updatedAt = "2026-10-01T00:00:00.000Z";
const input: PaymentInput = {
  requestId: id,
  idempotencyKey: id,
  invoiceNo: "QA",
  invoiceDate: "2026-01-01",
  subtotal: 100,
  vat: 0,
  delivery: "ครบถ้วน",
  formData: {
    formType: "pol02",
    formVersion: 1,
    approvalDate: "2026-01-01",
    departmentName: "ทดสอบ",
    requesterName: "ทดสอบ",
    subject: "ทดสอบ",
    projectActivity: "",
    budgetYear: 2570,
    fundSource: "income",
    departmentCode: "",
    fundCode: "",
    activityCode: "",
    expenseCategory: "",
    procurementMethod: "เฉพาะเจาะจง",
    egpProjectNo: "",
    contractNo: "",
    contractDate: "",
    vendorName: "ทดสอบ",
    vendorTaxId: "",
    contractAmount: 100,
    installmentNumber: 1,
    installmentCount: 1,
    documentChecklist: ["delivery_invoice"],
  },
  items: [
    {
      lineNo: 1,
      description: "ทดสอบ",
      attachmentType: "ใบแจ้งหนี้",
      documentNo: "QA",
      quantity: 1,
      unitPrice: 100,
    },
  ],
};
beforeEach(() => {
  vi.clearAllMocks();
  mock.user.mockResolvedValue({ data: { user: { id } } });
  mock.rpc.mockResolvedValue({
    data: [{ id, payment_no: "PV-QA", updated_at: updatedAt }],
    error: null,
  });
  mock.single.mockResolvedValue({ data: { updated_at: updatedAt }, error: null });
});
describe("POL02 saved and returned flow", () => {
  it("keeps ordinary creation and returns a version for retry", async () => {
    expect(await createPaymentDraft(input)).toMatchObject({
      error: null,
      paymentId: id,
      updatedAt,
    });
    expect(mock.rpc.mock.calls[0][0]).toBe("create_payment_request_draft");
  });
  it("uses the owner-checked revision RPC and its optimistic version", async () => {
    expect(
      (await createPaymentDraft(input, { id, updatedAt, removedAttachmentIds: [id] })).error,
    ).toBeNull();
    expect(mock.rpc).toHaveBeenCalledWith(
      "save_payment_request_revision",
      expect.objectContaining({
        target_payment_id: id,
        expected_updated_at: updatedAt,
        removed_attachment_ids: [id],
      }),
    );
  });
  it("keeps the RPC revision timestamp if a later read observes a newer version", async () => {
    mock.single.mockResolvedValue({
      data: { updated_at: "2026-10-02T00:00:00.000Z" },
      error: null,
    });
    expect(
      (await createPaymentDraft(input, { id, updatedAt, removedAttachmentIds: [] })).updatedAt,
    ).toBe(updatedAt);
  });
  it("rejects malformed revision identifiers without a write", async () => {
    expect(
      (await createPaymentDraft(input, { id: "bad", updatedAt, removedAttachmentIds: [] })).error,
    ).toBeTruthy();
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("surfaces stale writes without exposing database details", async () => {
    mock.rpc.mockResolvedValue({
      data: null,
      error: { message: "payment revision conflict secret SQL" },
    });
    const result = await createPaymentDraft(input, { id, updatedAt, removedAttachmentIds: [] });
    expect(result.error).toContain("หน้าต่างอื่น");
    expect(result.error).not.toContain("secret");
  });
  it("blocks expired sessions before writes", async () => {
    mock.user.mockResolvedValue({ data: { user: null } });
    expect((await createPaymentDraft(input)).error).toBeTruthy();
    expect((await submitPaymentDraft(id)).error).toBeTruthy();
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("invalidates the actual POL02 destination after submission", async () => {
    expect((await submitPaymentDraft(id)).paymentNo).toBe("PV-QA");
    expect(mock.revalidate).toHaveBeenCalledWith("/payments/PV-QA");
    expect(mock.revalidate).toHaveBeenCalledWith("/tasks");
  });
  it("requires a return reason before contacting the database", async () => {
    const form = new FormData();
    form.set("requestId", id);
    form.set("decision", "return");
    expect((await transitionPayment({ status: "idle", message: "" }, form)).status).toBe("error");
    expect(mock.rpc).not.toHaveBeenCalled();
  });
  it("routes decisions to payment RPC, never procurement RPC", async () => {
    const form = new FormData();
    form.set("requestId", id);
    form.set("decision", "return");
    form.set("comment", "แก้ไขใบแจ้งหนี้");
    expect((await transitionPayment({ status: "idle", message: "" }, form)).status).toBe("success");
    expect(mock.rpc).toHaveBeenCalledWith("transition_payment_request", {
      target_payment_id: id,
      decision: "return",
      decision_comment: "แก้ไขใบแจ้งหนี้",
    });
  });
});
