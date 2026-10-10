import { beforeEach, describe, expect, it, vi } from "vitest";
import { validateW119Submission } from "../../app/requests/w119/validation";
import type { NewRequestInput } from "../../app/requests/new/schemas";
import { createLoanAgreementFixture } from "../fixtures/w119-loan";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  rpc: vi.fn(),
  revalidate: vi.fn(),
  safeError: vi.fn(),
}));
vi.mock("../../lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: () => {
      const query = { select: mocks.select, eq: mocks.eq, maybeSingle: mocks.maybeSingle };
      mocks.select.mockReturnValue(query);
      mocks.eq.mockReturnValue(query);
      return query;
    },
    rpc: mocks.rpc,
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("../../lib/server/action-errors", () => ({ toSafeActionError: mocks.safeError }));

import { getReturnedRequestForEdit } from "../../app/lib/live-data";
import {
  updateReturnedRequest,
  resubmitReturnedRequest,
} from "../../app/requests/[id]/edit/actions";

const id = "11111111-1111-4111-8111-111111111111";
const owner = "22222222-2222-4222-8222-222222222222";
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const formData = {
  regulation: "หนังสือ ด่วนที่สุด ที่ กค (กวจ) 0405.2/ว119 ลงวันที่ 7 มีนาคม 2561",
  documentNo: "อว ทดสอบ/123",
  memoDate: "2026-09-29",
  departmentName: "ส่วนงานทดสอบ",
  phone: "3945",
  addressee: "คณบดีคณะรัฐศาสตร์",
  selectionCriteria: "เกณฑ์ราคา",
  advanceRequired: true,
  loanAgreement: createLoanAgreementFixture(),
  budgetCodes: {
    sourceCode: "2",
    departmentCode: "2301",
    fundCode: "4",
    planCode: "123",
    subprojectCode: "456",
    activityCode: "789",
  },
  requiresItemAttachment: false,
};
const input: NewRequestInput = {
  kind: "hire",
  title: "คำขอทดสอบการแก้ไข",
  rationale: "เพื่อทดสอบการส่งใหม่",
  requiredDate: tomorrow,
  budgetYear: 2570,
  fundSource: "เงินรายได้",
  planName: "แผนงานทดสอบ",
  expenseCategory: "ค่าใช้สอย",
  formData,
  items: [
    {
      line_no: 1,
      description: "รายการทดสอบ",
      quantity: 2,
      unit: "ชุด",
      unit_price: 100,
      market_price: 120,
      price_source: "ใบเสนอราคาเดิม",
    },
  ],
};
const stored = {
  id,
  request_no: "TEST-W119-001",
  requester_id: owner,
  status: "returned",
  current_step: 2,
  kind: input.kind,
  title: input.title,
  rationale: input.rationale,
  required_date: tomorrow,
  budget_year: 2570,
  fund_source: input.fundSource,
  plan_name: input.planName,
  expense_category: input.expenseCategory,
  form_data: { ...formData, formType: "w119", formVersion: 1 },
  request_items: [
    { ...input.items[0], line_no: 2, description: "รายการที่สอง" },
    { ...input.items[0] },
  ],
  request_attachments: [{ id: "attachment-1", file_name: "เอกสารเดิม.pdf", size_bytes: 1234 }],
  workflow_actions: [
    { action: "return", comment: "เหตุผลเก่า", created_at: "2026-09-29T00:00:00Z" },
    { action: "return", comment: "แก้ไขรายละเอียดราคา", created_at: "2026-10-09T00:00:00Z" },
  ],
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: owner } } });
  mocks.maybeSingle.mockResolvedValue({ data: structuredClone(stored), error: null });
  mocks.rpc.mockResolvedValue({ data: [{ request_no: stored.request_no }], error: null });
  mocks.safeError.mockReturnValue("เกิดข้อผิดพลาด กรุณาลองใหม่");
});

describe("returned W119 loading", () => {
  it("loads W119 instead of rejecting it, preserving all fields and sorting items", async () => {
    const result = await getReturnedRequestForEdit(stored.request_no);
    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({
      id,
      requestNo: stored.request_no,
      formType: "w119",
      kind: "hire",
      currentStep: 2,
      formData: {
        documentNo: formData.documentNo,
        memoDate: formData.memoDate,
        departmentName: formData.departmentName,
        phone: "3945",
        addressee: formData.addressee,
        advanceRequired: true,
        loanAgreement: createLoanAgreementFixture(),
        budgetCodes: formData.budgetCodes,
      },
      returnReason: "แก้ไขรายละเอียดราคา",
      attachments: [{ id: "attachment-1", fileName: "เอกสารเดิม.pdf", sizeBytes: 1234 }],
      items: [
        {
          description: "รายการทดสอบ",
          unitPrice: 100,
          marketPrice: 120,
          priceSource: "ใบเสนอราคาเดิม",
        },
        { description: "รายการที่สอง" },
      ],
    });
    expect(mocks.eq).toHaveBeenCalledWith("request_no", stored.request_no);
    expect(mocks.eq).toHaveBeenCalledWith("requester_id", owner);
    expect(mocks.eq).toHaveBeenCalledWith("status", "returned");
    expect(mocks.select).toHaveBeenCalledWith(
      expect.stringContaining("market_price, price_source"),
    );
  });
  it("does not fabricate a missing market price or price source", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: {
        ...stored,
        request_items: [{ ...input.items[0], market_price: null, price_source: null }],
      },
    });
    const result = await getReturnedRequestForEdit(stored.request_no);
    expect(result.data?.items[0]).toMatchObject({ marketPrice: null, priceSource: "" });
  });
  it("rejects an absent session without querying request data", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    expect((await getReturnedRequestForEdit(stored.request_no)).data).toBeNull();
    expect(mocks.select).not.toHaveBeenCalled();
  });
  it("fails closed for a missing, inaccessible or non-returned request", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null });
    expect((await getReturnedRequestForEdit(stored.request_no)).data).toBeNull();
  });
  it("continues supporting POL01 and refuses unknown form families", async () => {
    mocks.maybeSingle.mockResolvedValue({
      data: { ...stored, form_data: { formType: "standard" } },
    });
    expect((await getReturnedRequestForEdit(stored.request_no)).data?.formType).toBe("standard");
    mocks.maybeSingle.mockResolvedValue({
      data: { ...stored, form_data: { formType: "unknown" } },
    });
    expect((await getReturnedRequestForEdit(stored.request_no)).data).toBeNull();
  });
});

describe("returned request actions", () => {
  it("updates W119 in place with market prices, without creating a new request", async () => {
    expect(await updateReturnedRequest(id, input)).toEqual({ error: null });
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith(
      "update_returned_procurement_request",
      expect.objectContaining({
        target_request_id: id,
        request_form_data: { ...formData, formType: "w119", formVersion: 1 },
        request_items: input.items,
      }),
    );
    expect(mocks.eq).toHaveBeenCalledWith("requester_id", owner);
    expect(mocks.eq).toHaveBeenCalledWith("status", "returned");
  });
  it("requires a session and returned ownership before any write", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null } });
    expect((await updateReturnedRequest(id, input)).error).toContain("เข้าสู่ระบบ");
    mocks.getUser.mockResolvedValue({ data: { user: { id: owner } } });
    mocks.maybeSingle.mockResolvedValue({ data: null });
    expect((await updateReturnedRequest(id, input)).error).toContain("ไม่ได้ถูกส่งกลับ");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("blocks form-family conversion even with a valid payload", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { form_data: { formType: "standard" } } });
    expect((await updateReturnedRequest(id, input)).error).toContain("ประเภทแบบฟอร์ม");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("rejects incomplete W119 items and invalid IDs before writing", async () => {
    expect((await updateReturnedRequest("bad-id", input)).error).toBeTruthy();
    expect(
      (
        await updateReturnedRequest(id, {
          ...input,
          items: [{ ...input.items[0], market_price: undefined }],
        })
      ).error,
    ).toContain("ราคากลาง");
    expect(
      (
        await updateReturnedRequest(id, {
          ...input,
          items: [{ ...input.items[0], price_source: " " }],
        })
      ).error,
    ).toContain("ราคากลาง");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("keeps POL01 vendor resolution working", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: { form_data: { formType: "standard" } } });
    mocks.rpc
      .mockResolvedValueOnce({ data: [{ id, display_name: "ชื่อผู้ประกอบการจากฐานข้อมูล" }] })
      .mockResolvedValueOnce({ error: null });
    expect(
      (
        await updateReturnedRequest(id, {
          ...input,
          formData: {
            advanceFundingOption: "reimburse_after_purchase",
            vendor: { type: "registered", id, name: "ชื่อจากไคลเอนต์" },
            budgetCodes: { departmentCode: "2301", fundCode: "2", activityCode: "100" },
          },
        })
      ).error,
    ).toBeNull();
    expect(mocks.rpc).toHaveBeenLastCalledWith(
      "update_returned_procurement_request",
      expect.objectContaining({
        request_form_data: expect.objectContaining({
          vendor: { type: "registered", id, name: "ชื่อผู้ประกอบการจากฐานข้อมูล" },
        }),
      }),
    );
  });
  it("does not claim success or resubmit if the update RPC denies access", async () => {
    mocks.rpc.mockResolvedValue({ error: { message: "request owner required" } });
    expect((await updateReturnedRequest(id, input)).error).toBeTruthy();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it("resubmits using the original ID via the existing guarded workflow RPC", async () => {
    expect(await resubmitReturnedRequest(id)).toEqual({
      error: null,
      requestNo: stored.request_no,
    });
    expect(mocks.rpc).toHaveBeenCalledExactlyOnceWith("resubmit_returned_procurement_request", {
      target_request_id: id,
    });
    expect(mocks.revalidate).toHaveBeenCalledWith(`/requests/${stored.request_no}`);
    expect(mocks.revalidate).toHaveBeenCalledWith("/tasks");
  });
  it("does not claim resubmission when the workflow rejects it", async () => {
    mocks.rpc.mockResolvedValue({ error: { message: "request is not returned" } });
    expect((await resubmitReturnedRequest(id)).requestNo).toBeNull();
    expect(mocks.revalidate).not.toHaveBeenCalled();
  });
});

describe("W119 final validation", () => {
  it.each([2570, 2571, 2572])(
    "accepts both revised fund sources in fiscal year %s",
    (budgetYear) => {
      for (const fundSource of ["งบประมาณเงินรายได้", "งบประมาณเงินอุดหนุน"]) {
        expect(validateW119Submission({ ...input, budgetYear, fundSource }, 1, 100)).toBeNull();
      }
    },
  );
  it("rejects an unfilled plan instead of treating its placeholder as real data", () => {
    for (const planName of ["", "  "]) {
      expect(validateW119Submission({ ...input, planName }, 1, 100)?.step).toBe(2);
    }
  });
  it.each([
    "sourceCode",
    "departmentCode",
    "fundCode",
    "planCode",
    "subprojectCode",
    "activityCode",
  ])("rejects a blank %s and preserves entered leading zeroes", (code) => {
    const budgetCodes = { ...formData.budgetCodes, [code]: "" };
    expect(
      validateW119Submission({ ...input, formData: { ...formData, budgetCodes } }, 1, 100)?.step,
    ).toBe(2);
    budgetCodes[code as keyof typeof budgetCodes] = "00123";
    expect(
      validateW119Submission({ ...input, formData: { ...formData, budgetCodes } }, 1, 100),
    ).toBeNull();
    expect(budgetCodes[code as keyof typeof budgetCodes]).toBe("00123");
  });
  it("sends missing loan fields back to attachments without requiring an uploaded contract", () => {
    expect(
      validateW119Submission(
        { ...input, formData: { ...formData, loanAgreement: undefined } },
        1,
        100,
      )?.step,
    ).toBe(3);
    expect(
      validateW119Submission(
        {
          ...input,
          formData: {
            ...formData,
            loanAgreement: { ...createLoanAgreementFixture(), borrowerName: "" },
          },
        },
        1,
        100,
      )?.message,
    ).toContain("ชื่อ-นามสกุลผู้ยืม");
    expect(
      validateW119Submission(
        { ...input, formData: { ...formData, advanceRequired: false, loanAgreement: undefined } },
        1,
        100,
      ),
    ).toBeNull();
  });
  it("rejects zero loan amounts before a server write", async () => {
    const zero = { ...input, items: [{ ...input.items[0], unit_price: 0 }] };
    expect(validateW119Submission(zero, 1, 100)?.step).toBe(1);
    expect((await updateReturnedRequest(id, zero)).error).toBeTruthy();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("accepts valid edits using retained attachments only", () => {
    expect(validateW119Submission(input, 3, 1000)).toBeNull();
  });
  it("routes missing market prices and funding codes to the correct step", () => {
    expect(
      validateW119Submission(
        { ...input, items: [{ ...input.items[0], market_price: undefined }] },
        1,
        100,
      )?.step,
    ).toBe(1);
    expect(
      validateW119Submission(
        {
          ...input,
          formData: { ...formData, budgetCodes: { ...formData.budgetCodes, activityCode: "" } },
        },
        1,
        100,
      )?.step,
    ).toBe(2);
  });
  it("enforces the existing date rule without silently replacing the stored date", () => {
    expect(validateW119Submission({ ...input, requiredDate: "2000-01-01" }, 1, 100)).toMatchObject({
      step: 0,
      message: expect.stringContaining("วันที่ต้องการใช้"),
    });
  });
  it.each([
    [0, 0],
    [11, 100],
    [2, 51 * 1024 * 1024],
  ])("checks existing plus new attachment limits (%s)", (count, bytes) => {
    expect(validateW119Submission(input, count, bytes)?.step).toBe(3);
  });
});
