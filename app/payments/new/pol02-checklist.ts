import {
  POL01_CHECKLIST_CATEGORIES,
  type Pol01ChecklistCategory,
} from "../../requests/pol01-checklist";
import type { DocumentChecklistStatus } from "../../components/document-checklist-fields";
import type { pol02DocumentChecklist } from "./pol02";

// Both columns in the faculty checklist use the same procurement categories.
export const POL02_CHECKLIST_CATEGORIES = POL01_CHECKLIST_CATEGORIES.map(({ id, label }) => ({
  id,
  label,
}));
export type Pol02DocumentId = (typeof pol02DocumentChecklist)[number]["id"];
export type Pol02Checklist = {
  version: 1;
  categories: Pol01ChecklistCategory[];
  paymentCondition: "all" | "cash" | "credit";
  newVendor: boolean;
  entries: Record<string, DocumentChecklistStatus>;
};
type Item = {
  id: string;
  label: string;
  legacyId: Pol02DocumentId;
  optional?: boolean;
  condition?: "cash" | "credit";
};
const pr: Item = { id: "pr", label: "ไฟล์รายงานขอซื้อขอจ้าง (PR)", legacyId: "purchase_request" };
const credit: Item = {
  id: "credit_invoice",
  label: "ใบกำกับภาษี/ใบส่งสินค้า (กรณีร้านค้าให้เครดิตกับคณะ)",
  legacyId: "delivery_invoice",
  condition: "credit",
  optional: true,
};
const cash: Item = {
  id: "cash_receipt",
  label: "ใบเสร็จรับเงิน/บิลเงินสด/ใบสำคัญรับเงิน (กรณีชำระเงินสด)",
  legacyId: "payment_evidence",
  condition: "cash",
  optional: true,
};
const handover: Item = {
  id: "handover",
  label: "บันทึกส่งมอบงาน (ถ้ามี)",
  legacyId: "delivery_invoice",
  optional: true,
};
const photos: Item = { id: "photos", label: "รูปภาพประกอบ", legacyId: "other" };
const standard = [pr, credit, cash];
// Only the POL-02 column: do not copy POL-01 vehicle permits, TOR, quotes or loan contracts.
const specificItems: Record<Pol01ChecklistCategory, readonly Item[]> = {
  office: standard,
  scientific: standard,
  household: standard,
  electrical: standard,
  sports: standard,
  construction: standard,
  computer: standard,
  fuel: [pr, { ...cash, label: "ใบเสร็จรับเงิน/บิลเงินสด (กรณีชำระเงินสด)" }],
  rental: [pr, cash, photos],
  vehicle_rental: [pr, cash],
  custom_goods: [...standard, { ...photos, label: "รูปภาพสิ่งที่ได้จากการจ้างทำ" }],
  maintenance: [...standard, { ...photos, label: "รูปถ่ายหลังซ่อม (ถ้ามี)", optional: true }],
  individual_hire: [
    pr,
    handover,
    { id: "payment_voucher", label: "ใบสำคัญรับเงิน", legacyId: "payment_evidence" },
  ],
  service: [pr, handover, credit, cash],
  equipment: [...standard, { ...photos, label: "รูปภาพประกอบ (ถ้ามี)", optional: true }],
};

export function createPol02Checklist(
  categories: readonly Pol01ChecklistCategory[] = [],
  newVendor = false,
): Pol02Checklist {
  return {
    version: 1,
    categories: [...categories],
    paymentCondition: "all",
    newVendor,
    entries: {},
  };
}

export function getPol02ChecklistGroups(value: Pol02Checklist) {
  const basic: Item[] = [
    {
      id: "approved_project",
      label: "โครงการที่ได้รับอนุมัติแล้ว (ถ้ามี)",
      optional: true,
      legacyId: "other",
    },
    {
      id: "budget_change",
      label: "บันทึกข้อความที่ได้รับอนุมัติเปลี่ยนแปลงงบประมาณ (ถ้ามี)",
      optional: true,
      legacyId: "other",
    },
  ];
  if (value.newVendor)
    basic.push(
      {
        id: "vendor_documents",
        label:
          "เอกสารผู้ประกอบการรายใหม่ เช่น หนังสือรับรองบริษัท หรือบัตรประจำตัวประชาชน เพื่อเพิ่มฐานข้อมูลในระบบ UBUFMIS",
        legacyId: "other",
      },
      {
        id: "vendor_phone",
        label: "เบอร์โทรศัพท์ผู้ประกอบการรายใหม่ (ถ้ามี)",
        optional: true,
        legacyId: "other",
      },
    );
  return [
    { id: "basic", label: "เอกสารพื้นฐาน", items: basic },
    ...POL02_CHECKLIST_CATEGORIES.filter(({ id }) => value.categories.includes(id)).map(
      (category) => ({
        ...category,
        items: specificItems[category.id]
          .filter(
            (item) =>
              !item.condition ||
              value.paymentCondition === "all" ||
              item.condition === value.paymentCondition,
          )
          .map((item) => ({
            ...item,
            optional: item.condition ? value.paymentCondition === "all" : item.optional,
          })),
      }),
    ),
  ];
}

/** Removes stale answers after changing categories, cash/credit mode or vendor type. */
export function reconcilePol02Checklist(value: Pol02Checklist): Pol02Checklist {
  const categories = POL02_CHECKLIST_CATEGORIES.filter(({ id }) =>
    value.categories.includes(id),
  ).map(({ id }) => id);
  const entries: Pol02Checklist["entries"] = {};
  for (const group of getPol02ChecklistGroups({ ...value, categories })) {
    for (const item of group.items) {
      const key = `${group.id}.${item.id}`;
      const status = value.entries[key];
      if (status === "checked" || (status === "not_applicable" && item.optional))
        entries[key] = status;
    }
  }
  return { ...value, categories, entries };
}

function checkedItems(value: Pol02Checklist) {
  const normalized = reconcilePol02Checklist(value);
  return getPol02ChecklistGroups(normalized).flatMap((group) =>
    group.items.filter((item) => normalized.entries[`${group.id}.${item.id}`] === "checked"),
  );
}

/** Keep the database's existing 8-ID contract; full source-specific answers are stored separately. */
export function getPol02DocumentIds(value: Pol02Checklist): Pol02DocumentId[] {
  return [...new Set(checkedItems(value).map((item) => item.legacyId))];
}

export function getPol02DocumentLabels(value: Pol02Checklist): string[] {
  return [...new Set(checkedItems(value).map((item) => item.label))];
}
