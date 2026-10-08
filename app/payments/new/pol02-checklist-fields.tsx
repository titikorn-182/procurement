"use client";
import { DocumentChecklistFields } from "../../components/document-checklist-fields";
import {
  POL02_CHECKLIST_CATEGORIES,
  getPol02ChecklistGroups,
  reconcilePol02Checklist,
  type Pol02Checklist,
} from "./pol02-checklist";

/* Local POL-02 extension: inherit the flat, square Thai document ledger.
 * Review the payment condition, select categories, check the POL-02 source rows, then upload files.
 * Cash/credit choices precede grouped rows; mobile stacks controls and wraps full Thai labels.
 * Self-checks are not staff approval. Preserve the existing one-document/one-file submission gate. */
export function Pol02ChecklistFields({
  value,
  onChange,
  disabled,
}: {
  value: Pol02Checklist;
  onChange: (value: Pol02Checklist) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-5">
      <fieldset
        disabled={disabled}
        className="min-w-0 space-y-3 border-b border-[var(--line)] pb-5"
      >
        <legend className="mb-2 font-semibold">เงื่อนไขเอกสารเบิกจ่าย</legend>
        <label className="block max-w-xl text-sm">
          <span className="mb-2 block">กรณีชำระเงินของรายการที่เบิกครั้งนี้</span>
          <select
            value={value.paymentCondition}
            onChange={(event) => {
              const paymentCondition = event.target.value;
              if (
                paymentCondition === "all" ||
                paymentCondition === "cash" ||
                paymentCondition === "credit"
              )
                onChange(reconcilePol02Checklist({ ...value, paymentCondition }));
            }}
            className="min-h-11 w-full border border-[var(--line-dark)] bg-white px-3 text-[var(--ink)]"
          >
            <option value="all">ยังไม่ระบุ / มีทั้งเงินสดและเครดิต</option>
            <option value="cash">ชำระเงินสด / สำรองจ่ายแล้ว</option>
            <option value="credit">ร้านค้าให้เครดิตกับคณะ</option>
          </select>
        </label>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 text-sm leading-6">
          <input
            type="checkbox"
            checked={value.newVendor}
            className="size-5 shrink-0 accent-[var(--orange)]"
            onChange={(event) =>
              onChange(reconcilePol02Checklist({ ...value, newVendor: event.target.checked }))
            }
          />
          เป็นผู้ประกอบการรายใหม่ที่ต้องเพิ่มฐานข้อมูล UBUFMIS
        </label>
        <p className="max-w-3xl text-sm leading-6 text-stone-600">
          ตรวจประเภทพัสดุให้ตรงกับรายการที่เบิกครั้งนี้ แม้ระบบจะนำประเภทที่เคยเลือกใน POL-01
          มาแสดงให้แล้ว ผลการติ๊กเอกสารจะเริ่มใหม่เสมอ
        </p>
      </fieldset>
      <DocumentChecklistFields
        title="เช็คลิสต์ใบขอเบิกจัดซื้อจัดจ้าง (POL-02)"
        description="เลือกประเภทพัสดุ แล้วติ๊กเมื่อได้ตรวจสอบเอกสารที่แนบจริง การติ๊กไม่ใช่การอัปโหลดไฟล์ กรุณาแนบเอกสารในส่วนด้านล่าง"
        footer="เป็นการตรวจสอบด้วยตนเอง ไม่ใช่ผลตรวจหรืออนุมัติของเจ้าหน้าที่ ไม่จำเป็นต้องติ๊กครบทุกข้อ แต่ก่อนส่งคำขอต้องตรวจเอกสารอย่างน้อย 1 รายการและอัปโหลดอย่างน้อย 1 ไฟล์ตามเงื่อนไขเดิม"
        categories={POL02_CHECKLIST_CATEGORIES}
        selectedCategories={value.categories}
        groups={getPol02ChecklistGroups(value)}
        entries={value.entries}
        disabled={disabled}
        onCategoriesChange={(categories) =>
          onChange(reconcilePol02Checklist({ ...value, categories }))
        }
        onStatusChange={(key, status) => {
          const next = reconcilePol02Checklist(value);
          if (next.entries[key] === status) delete next.entries[key];
          else next.entries[key] = status;
          onChange(next);
        }}
      />
    </div>
  );
}
