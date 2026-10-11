import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PaymentRecord } from "../../features/payments/model";
const mock = vi.hoisted(() => ({
  payment: vi.fn(),
  access: vi.fn(),
  from: vi.fn(),
  balance: vi.fn(),
  source: vi.fn(),
  filter: vi.fn(),
  eq: vi.fn(),
  neq: vi.fn(),
}));
vi.mock("../../features/payments/server/queries", () => ({
  getPayment: mock.payment,
  getPaymentAccess: mock.access,
}));
vi.mock("../../lib/supabase/server", () => ({ createClient: async () => ({ from: mock.from }) }));
import {
  getPaymentForEditing,
  getPayableSources,
} from "../../features/payments/server/form-queries";
const payment: PaymentRecord = {
  id: "payment",
  payment_no: "PV-TEST",
  requester_id: "owner",
  procurement_request_id: "source",
  status: "returned",
  current_step: 3,
  created_at: "2026-10-01T00:00:00Z",
  updated_at: "2026-10-02T00:00:00Z",
  submitted_at: null,
  invoice_no: "TEST",
  invoice_date: "2026-10-01",
  subtotal: 100,
  vat_amount: 0,
  total_amount: 100,
  delivery_detail: "ครบ",
  form_data: { formType: "pol02", subject: "ทดสอบ" },
  idempotency_key: null,
  payment_items: [],
  payment_attachments: [
    {
      id: "attachment",
      file_name: "original.pdf",
      mime_type: "application/pdf",
      size_bytes: 20,
      created_at: "2026-10-01",
    },
  ],
  payment_workflow_tasks: [],
  payment_workflow_actions: [],
  procurement_requests: {
    request_no: "POL01-TEST",
    title: "ทดสอบ",
    estimated_amount: 1000,
    plan_name: "แผน",
  },
};
beforeEach(() => {
  vi.resetAllMocks();
  mock.payment.mockResolvedValue({ data: structuredClone(payment), error: null });
  mock.access.mockResolvedValue({ owner: true });
  mock.balance.mockResolvedValue({
    data: [{ total_amount: 200 }, { total_amount: 50 }],
    error: null,
  });
  mock.source.mockResolvedValue({ data: [], error: null });
  mock.from.mockImplementation(() => {
    const q = {
      select: () => q,
      eq: mock.eq,
      neq: mock.neq,
      not: mock.balance,
      in: mock.filter,
      order: mock.source,
    };
    for (const fn of [mock.eq, mock.neq, mock.filter]) fn.mockReturnValue(q);
    return q;
  });
});
describe("payment form queries", () => {
  it("returns a form-ready DTO preserving identity, return step, originals and current balance", async () => {
    const result = await getPaymentForEditing("PV-TEST");
    expect(result).toMatchObject({
      kind: "ready",
      source: { paid: 250, approved: 1000 },
      initial: {
        id: "payment",
        status: "returned",
        currentStep: 3,
        idempotencyKey: "payment",
        updatedAt: payment.updated_at,
        attachments: payment.payment_attachments,
      },
    });
    expect(mock.eq).toHaveBeenCalledWith("procurement_request_id", "source");
    expect(mock.neq).toHaveBeenCalledWith("id", "payment");
    expect(mock.balance).toHaveBeenCalledWith("status", "in", "(cancelled,draft)");
    expect(result).not.toHaveProperty("form_data");
  });
  it("does not read balances for a different owner", async () => {
    mock.access.mockResolvedValue({ owner: false });
    expect(await getPaymentForEditing("PV-TEST")).toEqual({ kind: "forbidden" });
    expect(mock.from).not.toHaveBeenCalled();
  });
  it.each(["submitted", "approved", "completed"] as const)("does not edit %s", async (status) => {
    mock.payment.mockResolvedValue({ data: { ...payment, status }, error: null });
    expect(await getPaymentForEditing("PV-TEST")).toEqual({ kind: "forbidden" });
    expect(mock.balance).not.toHaveBeenCalled();
  });
  it("denies incompatible form families", async () => {
    mock.payment.mockResolvedValue({
      data: { ...payment, form_data: { formType: "w119" } },
      error: null,
    });
    expect(await getPaymentForEditing("PV-TEST")).toEqual({ kind: "forbidden" });
  });
  it("distinguishes a missing payment from a database outage", async () => {
    mock.payment.mockResolvedValue({ data: null, error: null });
    expect(await getPaymentForEditing("missing")).toEqual({ kind: "not_found" });
    mock.payment.mockResolvedValue({ data: null, error: "safe failure" });
    await expect(getPaymentForEditing("missing")).rejects.toThrow("payment unavailable");
  });
  it("does not invent a zero balance after a query failure", async () => {
    mock.balance.mockResolvedValue({ data: null, error: { message: "private SQL" } });
    await expect(getPaymentForEditing("PV-TEST")).rejects.toThrow("payment balance unavailable");
  });
  it("preserves the payable request statuses and safe empty response", async () => {
    expect(await getPayableSources()).toEqual({ requests: [], error: null });
    expect(mock.filter).toHaveBeenCalledWith("status", ["approved", "ordered", "completed"]);
  });
});
