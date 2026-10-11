import {
  createExternalDraft,
  externalMetadata,
  type ExternalDraft,
} from "../../app/requests/pol-external/model";
import type { ReturnedStandardRequestEditData } from "../../app/requests/[id]/edit/types";
import { createDefaultPol01ApprovalDetails } from "../../app/requests/pol01";
import { createPol01Checklist } from "../../app/requests/pol01-checklist";

export function externalFixture(): ExternalDraft {
  const data = createExternalDraft("2026-10-11");
  return {
    ...data,
    title: "จ้างเหมาบริการโครงการทดสอบ (ข้อมูลสมมติ)",
    rationale: "เพื่อดำเนินกิจกรรมบริการวิชาการจากแหล่งทุนภายนอก ข้อมูลนี้ใช้ทดสอบเท่านั้น",
    requiredDate: "2099-10-20",
    planName: "โครงการบริการวิชาการทดสอบ",
    advanceFundingOption: "reimburse_after_purchase",
    metadata: {
      ...data.metadata,
      documentNo: "อว ทดสอบ/001",
      torNote: "รายละเอียด TOR ตามเอกสารที่แนบ (ทดสอบ)",
    },
    budgetCodes: {
      sourceCode: "02",
      departmentCode: "02301",
      fundCode: "06",
      activityCode: "001234567890",
    },
    items: [
      {
        description: "จ้างเหมาบริการจัดกิจกรรมทดสอบ",
        quantity: 2,
        unit: "งาน",
        unitPrice: 1500.25,
        note: "รวมค่าเดินทางและอุปกรณ์แล้ว",
      },
    ],
  };
}
export function returnedExternalFixture(): ReturnedStandardRequestEditData {
  const data = externalFixture();
  return {
    id: "11111111-1111-4111-8111-111111111111",
    requestNo: "POL01-TEST-001",
    currentStep: 2,
    formType: "standard",
    kind: "hire",
    title: data.title,
    rationale: data.rationale,
    requiredDate: data.requiredDate,
    budgetYear: data.budgetYear,
    fundSource: data.fundSource,
    planName: data.planName,
    expenseCategory: data.expenseCategory,
    externalPol01: externalMetadata(data),
    advanceFundingOption: "reimburse_after_purchase",
    vendor: { kind: "none" },
    ...data.budgetCodes,
    items: data.items.map((item) => ({
      description: item.description,
      quantity: item.quantity!,
      unit: item.unit,
      unitPrice: item.unitPrice!,
    })),
    attachments: [],
    returnReason: "กรุณาแก้หมายเหตุรายการ (ทดสอบ)",
    approvalDetails: createDefaultPol01ApprovalDetails(),
    documentChecklist: createPol01Checklist(),
  };
}
