import { describe, expect, it } from "vitest";
import { newRequestInputSchema, parseRequestFormData } from "../../app/requests/new/schemas";

const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);

const baseRequest = {
  kind: "purchase" as const,
  title: "จัดซื้อวัสดุสำนักงาน",
  rationale: "เพื่อใช้ในการปฏิบัติงานของหน่วยงาน",
  requiredDate: tomorrow,
  budgetYear: 2570,
  fundSource: "เงินรายได้",
  planName: "แผนงานบริหารทั่วไป",
  expenseCategory: "ค่าวัสดุ",
  formData: {},
  items: [
    {
      line_no: 1,
      description: "กระดาษ A4",
      quantity: 2,
      unit: "รีม",
      unit_price: 120,
    },
  ],
};

describe("newRequestInputSchema", () => {
  it("accepts a bounded, structured request", () => {
    expect(newRequestInputSchema.safeParse(baseRequest).success).toBe(true);
  });

  it("rejects duplicated item line numbers", () => {
    const result = newRequestInputSchema.safeParse({
      ...baseRequest,
      items: [baseRequest.items[0], { ...baseRequest.items[0] }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects non-finite amounts", () => {
    const result = newRequestInputSchema.safeParse({
      ...baseRequest,
      items: [{ ...baseRequest.items[0], unit_price: Number.POSITIVE_INFINITY }],
    });
    expect(result.success).toBe(false);
  });
});

describe("parseRequestFormData", () => {
  it("normalizes derived fields for the standard form", () => {
    const result = parseRequestFormData({
      advanceFundingOption: "borrow_before_purchase",
      requiresLoanAgreement: false,
      vendor: null,
      requiresVendorDocuments: true,
      budgetCodes: {
        departmentCode: "2301",
        fundCode: "6",
        activityCode: "510252000024",
      },
    });
    expect(result.success).toBe(true);
    if (result.success && result.data.formType === "standard") {
      expect(result.data.formType).toBe("standard");
      expect(result.data.formVersion).toBe(1);
      expect(result.data.requiresLoanAgreement).toBe(true);
      expect(result.data.requiresVendorDocuments).toBe(false);
    }
  });

  it("requires a vendor for direct vendor payment", () => {
    const result = parseRequestFormData({
      advanceFundingOption: "faculty_direct_pay_credit_vendor",
      vendor: null,
      budgetCodes: {
        departmentCode: "2301",
        fundCode: "6",
        activityCode: "510252000024",
      },
    });
    expect(result.success).toBe(false);
  });

  it("recognizes and versions a W119 form", () => {
    const result = parseRequestFormData({
      regulation: "หนังสือ ด่วนที่สุด ที่ กค (กวจ) 0405.2/ว119",
      documentNo: "อว 0604.19/1",
      memoDate: "2026-08-30",
      departmentName: "สำนักงานเลขานุการคณะ",
      phone: "3944",
      addressee: "คณบดีคณะรัฐศาสตร์",
      selectionCriteria: "เกณฑ์ราคา",
      advanceRequired: false,
      inspectors: [],
      budgetCodes: {
        sourceCode: "2",
        departmentCode: "2301",
        fundCode: "6",
        planCode: "1",
        subprojectCode: "51025200",
        activityCode: "510252000024",
      },
      requiresItemAttachment: false,
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.formType).toBe("w119");
  });
});
