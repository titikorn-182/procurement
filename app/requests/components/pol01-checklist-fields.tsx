"use client";
import { DocumentChecklistFields } from "../../components/document-checklist-fields";
import {
  POL01_CHECKLIST_CATEGORIES,
  getPol01ChecklistGroups,
  reconcilePol01Checklist,
  type Pol01Checklist,
  type Pol01ChecklistContext,
} from "../pol01-checklist";

/** Existing POL-01 self-check behavior, using the shared document-ledger controls. */
export function Pol01ChecklistFields({
  value,
  context,
  onChange,
  disabled = false,
}: {
  value: Pol01Checklist;
  context: Pol01ChecklistContext;
  onChange: (value: Pol01Checklist) => void;
  disabled?: boolean;
}) {
  return (
    <DocumentChecklistFields
      title="เช็คลิสต์ใบขอซื้อขอจ้าง (POL-01)"
      description="เลือกประเภทพัสดุ แล้วติ๊กเมื่อได้ตรวจสอบข้อมูลหรือเอกสารของรายการนั้นแล้ว การติ๊กไม่ใช่การแนบไฟล์ กรุณาอัปโหลดเอกสารในส่วนด้านล่าง"
      footer="เป็นการตรวจสอบด้วยตนเอง ไม่ใช่ผลตรวจของเจ้าหน้าที่ รายการที่ยังไม่ติ๊กไม่ปิดกั้นการส่งคำขอ และไม่บังคับแนบสัญญายืมเงิน เงื่อนไขแนบเอกสารผู้ประกอบการรายใหม่ยังใช้ตามเดิม"
      categories={POL01_CHECKLIST_CATEGORIES}
      selectedCategories={value.categories}
      groups={getPol01ChecklistGroups(value.categories, context)}
      entries={value.entries}
      onCategoriesChange={(categories) =>
        onChange(reconcilePol01Checklist({ ...value, categories }, context))
      }
      onStatusChange={(key, status) => {
        const next = reconcilePol01Checklist(value, context);
        if (next.entries[key] === status) delete next.entries[key];
        else next.entries[key] = status;
        onChange(next);
      }}
      disabled={disabled}
    />
  );
}
