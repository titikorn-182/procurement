import { describe, expect, it } from "vitest";
import { toPaymentSource, type PayableSourceRecord } from "../../features/payments/mappers";
import { toRequestEditData, type EditableRequestRecord } from "../../features/requests/edit-mapper";

const source: PayableSourceRecord = {
  id: "source",
  request_no: "POL01-TEST",
  title: "ทดสอบ",
  rationale: "ข้อมูลสมมติ",
  budget_year: 2570,
  fund_source: "income",
  plan_name: null,
  expense_category: null,
  estimated_amount: 1000,
  form_data: {
    vendor: { type: "new", name: "ร้านทดสอบ" },
    budgetCodes: { departmentCode: "0023", fundCode: "08", activityCode: "001234" },
  },
  departments: { name_th: "หน่วยทดสอบ" },
  profiles: { full_name: "ผู้ทดสอบ" },
  request_items: [
    { line_no: 2, description: "สอง", quantity: 2, unit_price: 100 },
    { line_no: 1, description: "หนึ่ง", quantity: 1, unit_price: 300 },
  ],
  payment_requests: [
    { status: "draft", total_amount: 800 },
    { status: "cancelled", total_amount: 700 },
    { status: "approved", total_amount: 100 },
    { status: "returned", total_amount: 200 },
    { status: "submitted", total_amount: 50 },
  ],
};
describe("payment source DTO mapping", () => {
  it("preserves the existing balance rule, including returned payments", () => {
    expect(toPaymentSource(source)).toMatchObject({ approved: 1000, paid: 350 });
  });
  it("preserves zero-prefixed codes, names and sorted items without mutating query data", () => {
    const before = structuredClone(source);
    const result = toPaymentSource(source);
    expect(result).toMatchObject({
      departmentCode: "0023",
      fundCode: "08",
      activityCode: "001234",
      vendorName: "ร้านทดสอบ",
      requesterName: "ผู้ทดสอบ",
    });
    expect(result.items.map((i) => i.description)).toEqual(["หนึ่ง", "สอง"]);
    expect(source).toEqual(before);
    expect(result).not.toHaveProperty("form_data");
  });
  it.each([null, [], "legacy"])("handles legacy JSON %j and missing relations", (form_data) => {
    expect(
      toPaymentSource({ ...source, form_data, profiles: null, departments: null }),
    ).toMatchObject({
      departmentCode: "",
      fundCode: "",
      requesterName: "—",
      departmentName: "—",
      vendorName: "",
    });
  });
});

const editable: EditableRequestRecord = {
  id: "request",
  request_no: "POL01-TEST",
  requester_id: "owner",
  kind: "purchase",
  title: "ทดสอบ",
  rationale: "ทดสอบ",
  required_date: "2026-10-20",
  budget_year: 2570,
  fund_source: "income",
  plan_name: "แผน",
  expense_category: "ค่าวัสดุ",
  status: "returned",
  current_step: 3,
  form_data: { formType: "standard", budgetCodes: { sourceCode: "02", departmentCode: "0023" } },
  request_items: [
    {
      line_no: 2,
      description: "สอง",
      quantity: 2,
      unit: "ชุด",
      unit_price: 50,
      market_price: 55,
      price_source: "ทดสอบ",
    },
    {
      line_no: 1,
      description: "หนึ่ง",
      quantity: 1,
      unit: "ชุด",
      unit_price: 20,
      market_price: null,
      price_source: null,
    },
  ],
  request_attachments: [{ id: "file", file_name: "original.pdf", size_bytes: null }],
  workflow_actions: [
    { action: "return", comment: "เหตุผลเก่า", created_at: "2026-10-01" },
    { action: "return", comment: "เหตุผลล่าสุด", created_at: "2026-10-02" },
  ],
};
describe("returned request DTO mapping", () => {
  it("retains identity, return step, originals and latest reason without changing input", () => {
    const before = structuredClone(editable);
    const result = toRequestEditData(editable);
    expect(result.error).toBeNull();
    expect(result.data).toMatchObject({
      id: "request",
      currentStep: 3,
      returnReason: "เหตุผลล่าสุด",
      sourceCode: "02",
      departmentCode: "0023",
      attachments: [{ id: "file", fileName: "original.pdf", sizeBytes: 0 }],
    });
    expect(result.data?.items.map((i) => i.description)).toEqual(["หนึ่ง", "สอง"]);
    expect(editable).toEqual(before);
  });
  it("keeps legacy W119 optional fields editable without migrating stored data", () => {
    const result = toRequestEditData({
      ...editable,
      status: "draft",
      form_data: { formType: "w119", budgetCodes: { sourceCode: "02" } },
    });
    expect(result.data).toMatchObject({
      formType: "w119",
      status: "draft",
      formData: { addressee: "", advanceRequired: false, budgetCodes: { sourceCode: "02" } },
    });
  });
  it.each([null, { formType: "unknown" }, { formType: "standard", externalPol01: {} }])(
    "rejects unsupported/corrupt form %j",
    (form_data) => {
      expect(toRequestEditData({ ...editable, form_data }).data).toBeNull();
    },
  );
});
