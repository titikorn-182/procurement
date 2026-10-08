import { describe, expect, it } from "vitest";
import { paymentInputSchema } from "../../app/payments/new/schemas";
import { createPol02Checklist } from "../../app/payments/new/pol02-checklist";

const validPayment = {
  requestId: "550e8400-e29b-41d4-a716-446655440000",
  idempotencyKey: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
  invoiceNo: "INV-001",
  invoiceDate: "2026-08-30",
  subtotal: 1_000,
  vat: 70,
  delivery: "ตรวจรับเรียบร้อย",
  formData: {
    formType: "pol02" as const,
    formVersion: 1 as const,
    approvalDate: "2026-08-29",
    departmentName: "สำนักงานเลขานุการคณะ",
    requesterName: "ผู้ขอเบิก",
    subject: "จัดซื้อวัสดุสำนักงาน",
    projectActivity: "งานบริหารทั่วไป",
    budgetYear: 2569,
    fundSource: "เงินรายได้",
    departmentCode: "POL",
    fundCode: "01",
    activityCode: "A01",
    expenseCategory: "ค่าวัสดุ",
    procurementMethod: "วิธีเฉพาะเจาะจง",
    egpProjectNo: "",
    contractNo: "PO-001",
    contractDate: "2026-08-28",
    vendorName: "ร้านทดสอบ",
    vendorTaxId: "",
    contractAmount: 1_070,
    installmentNumber: 1,
    installmentCount: 1,
    documentChecklist: ["delivery_invoice"],
  },
  items: [
    {
      lineNo: 1,
      description: "กระดาษ A4",
      attachmentType: "ใบส่งของ/ใบแจ้งหนี้",
      documentNo: "INV-001",
      quantity: 10,
      unitPrice: 100,
    },
  ],
};

describe("paymentInputSchema", () => {
  it("accepts a valid payment", () => {
    expect(paymentInputSchema.safeParse(validPayment).success).toBe(true);
  });

  it("stores the full POL02 checklist and derives the database summary on the server", () => {
    const checklist = createPol02Checklist(["office"]);
    checklist.entries["office.pr"] = "checked";
    const parsed = paymentInputSchema.parse({
      ...validPayment,
      formData: {
        ...validPayment.formData,
        supportingDocumentChecklist: checklist,
        documentChecklist: ["inspection"],
      },
    });
    expect(parsed.formData.supportingDocumentChecklist).toEqual(checklist);
    expect(parsed.formData.documentChecklist).toEqual(["purchase_request"]);
  });

  it("does not count inapplicable or empty answers toward the existing one-document gate", () => {
    const checklist = createPol02Checklist(["office"]);
    for (const entries of [{}, { "basic.approved_project": "not_applicable" }]) {
      expect(
        paymentInputSchema.safeParse({
          ...validPayment,
          formData: {
            ...validPayment.formData,
            supportingDocumentChecklist: { ...checklist, entries },
          },
        }).success,
      ).toBe(false);
    }
  });

  it("rejects unknown IDs before calling the database", () => {
    expect(
      paymentInputSchema.safeParse({
        ...validPayment,
        formData: {
          ...validPayment.formData,
          documentChecklist: ["unknown"],
        },
      }).success,
    ).toBe(false);
  });

  it("rejects malformed UUIDs and a zero total", () => {
    expect(
      paymentInputSchema.safeParse({
        ...validPayment,
        requestId: "not-a-uuid",
        subtotal: 0,
        vat: 0,
      }).success,
    ).toBe(false);
  });

  it("rejects payment lines that do not match the subtotal", () => {
    expect(paymentInputSchema.safeParse({ ...validPayment, subtotal: 900 }).success).toBe(false);
  });

  it("requires a POL02 document checklist and valid installment order", () => {
    expect(
      paymentInputSchema.safeParse({
        ...validPayment,
        formData: {
          ...validPayment.formData,
          installmentNumber: 2,
          installmentCount: 1,
          documentChecklist: [],
        },
      }).success,
    ).toBe(false);
  });
});
