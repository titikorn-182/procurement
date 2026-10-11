import { createDefaultPol01ApprovalDetails } from "../../app/requests/pol01";
import { createPol01Checklist } from "../../app/requests/pol01-checklist";
import type {
  ReturnedStandardRequestEditData,
  ReturnedW119RequestEditData,
} from "../../features/requests/edit-types";
import { createLoanAgreementFixture } from "./w119-loan";

export function standardEditFixture(): ReturnedStandardRequestEditData {
  return {
    formType: "standard",
    status: "returned",
    id: "test-only",
    requestNo: "TEST-POL01",
    currentStep: 3,
    kind: "purchase",
    title: "รายการทดสอบ",
    rationale: "เหตุผลทดสอบ",
    requiredDate: "2099-10-20",
    budgetYear: 2570,
    fundSource: "เงินรายได้",
    planName: "แผนทดสอบ",
    expenseCategory: "ค่าวัสดุ",
    returnReason: "แก้ไขราคา",
    attachments: [{ id: "original", fileName: "ต้นฉบับ.pdf", sizeBytes: 1024 }],
    advanceFundingOption: "reimburse_after_purchase",
    vendor: { kind: "none" },
    sourceCode: "02",
    departmentCode: "02301",
    fundCode: "02",
    activityCode: "00100",
    approvalDetails: createDefaultPol01ApprovalDetails(),
    documentChecklist: createPol01Checklist(),
    items: [
      {
        description: "กระดาษ",
        quantity: 2,
        unit: "รีม",
        unitPrice: 100,
        marketPrice: 120,
        priceSource: "ใบเสนอราคา",
      },
    ],
  };
}

export function w119EditFixture(): ReturnedW119RequestEditData {
  const base = standardEditFixture();
  return {
    ...base,
    formType: "w119",
    requestNo: "TEST-W119",
    items: [
      {
        description: "กระดาษ",
        quantity: 2,
        unit: "รีม",
        unitPrice: 100,
        marketPrice: 120,
        priceSource: "ใบเสนอราคา",
      },
    ],
    formData: {
      regulation: "ว119",
      documentNo: "อว ทดสอบ",
      memoDate: "2026-10-10",
      departmentName: "ส่วนงานทดสอบ",
      phone: "1234",
      addressee: "ผู้รับบันทึกเดิม",
      selectionCriteria: "เกณฑ์ราคา",
      advanceRequired: true,
      loanAgreement: createLoanAgreementFixture(),
      budgetCodes: {
        sourceCode: "02",
        departmentCode: "02301",
        fundCode: "02",
        planCode: "01",
        subprojectCode: "01",
        activityCode: "00100",
      },
    },
  };
}
