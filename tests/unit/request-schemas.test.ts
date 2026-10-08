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
  it.each([
    "borrow_before_purchase",
    "reimburse_after_purchase",
    "faculty_direct_pay_credit_vendor",
  ])("does not require a loan agreement for POL01 %s, even from an older client", (option) => {
    const result = parseRequestFormData({
      advanceFundingOption: option,
      requiresLoanAgreement: true,
      vendor: { type: "registered", id: "existing-vendor", name: "ผู้ประกอบการเดิม" },
      budgetCodes: { departmentCode: "2301", fundCode: "2", activityCode: "100210230004" },
    });

    expect(result.success).toBe(true);
    if (result.success && result.data.formType === "standard") {
      expect(result.data.advanceFundingOption).toBe(option);
      expect(result.data.requiresLoanAgreement).toBe(false);
      expect(result.data.requiresVendorDocuments).toBe(false);
    }
  });

  it("still requires new vendor documents when borrowing without a loan agreement", () => {
    const result = parseRequestFormData({
      advanceFundingOption: "borrow_before_purchase",
      requiresLoanAgreement: true,
      requiresVendorDocuments: false,
      vendor: { type: "new", name: "ผู้ประกอบการรายใหม่" },
      budgetCodes: { departmentCode: "2301", fundCode: "2", activityCode: "100210230004" },
    });

    expect(result.success).toBe(true);
    if (result.success && result.data.formType === "standard") {
      expect(result.data.requiresLoanAgreement).toBe(false);
      expect(result.data.requiresVendorDocuments).toBe(true);
    }
  });

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
      expect(result.data.requiresLoanAgreement).toBe(false);
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

  it("accepts the POL01 budget source and approval details", () => {
    const result = parseRequestFormData({
      advanceFundingOption: "reimburse_after_purchase",
      vendor: null,
      budgetCodes: {
        sourceCode: "2",
        departmentCode: "2301",
        fundCode: "2",
        activityCode: "100210230004",
      },
      approvalDetails: {
        requester: {
          name: "นายฐิติกรณ์รัศมิ์ ภัททสิริภูวดล",
          position: "รก.หัวหน้าสำนักงานเลขานุการ",
        },
        committee: [
          { name: "นายฐิติกรณ์รัศมิ์ ภัททสิริภูวดล", role: "ประธาน" },
          { name: "", role: "กรรมการ" },
          { name: "", role: "กรรมการ" },
        ],
        endorser: {
          name: "นายวุฒิ อิงคภาวรวงศ์",
          position: "รองคณบดีฝ่ายบริหารและพัฒนาองค์การ",
        },
        approver: {
          name: "นางสาวศิริพร จันทนสกุลวงศ์",
          position: "คณบดีคณะรัฐศาสตร์ ปฏิบัติราชการแทนอธิการบดี",
        },
      },
    });

    expect(result.success).toBe(true);
    if (result.success && result.data.formType === "standard") {
      expect(result.data.budgetCodes.sourceCode).toBe("2");
      expect(result.data.approvalDetails?.committee[0].role).toBe("ประธาน");
    }
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
    if (result.success) {
      expect(result.data.formType).toBe("w119");
      expect("inspectors" in result.data).toBe(false);
    }
  });

  it("removes legacy W119 inspectors from normalized form data", () => {
    const result = parseRequestFormData({
      regulation: "หนังสือ ด่วนที่สุด ที่ กค (กวจ) 0405.2/ว119",
      documentNo: "อว 0604.19/1",
      memoDate: "2026-08-30",
      departmentName: "สำนักงานเลขานุการคณะ",
      phone: "3944",
      addressee: "คณบดีคณะรัฐศาสตร์",
      selectionCriteria: "เกณฑ์ราคา",
      advanceRequired: false,
      inspectors: ["ผู้ตรวจรับเดิม"],
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
    if (result.success) expect("inspectors" in result.data).toBe(false);
  });
});
