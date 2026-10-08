"use client";

import { useId } from "react";
import {
  POL01_CHECKLIST_CATEGORIES,
  checklistEntryKey,
  getPol01ChecklistGroups,
  reconcilePol01Checklist,
  summarizePol01Checklist,
  type Pol01Checklist,
  type Pol01ChecklistContext,
  type Pol01ChecklistStatus,
} from "../pol01-checklist";

/* Local extension contract: a Thai document self-check ledger within step 4.
 * Inherit paper, graphite text, square rules, and orange controls; no new visual identity.
 * Choose applicable categories, check the source-backed rows, then upload actual evidence.
 * Categories precede grouped rows; mobile stacks each row's actions without truncating Thai.
 * Finish: desktop/mobile review and surface documentation; not an approval or submission gate. */
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
  const headingId = useId();
  const groups = getPol01ChecklistGroups(value.categories, context);
  const summary = summarizePol01Checklist(value, context);

  function updateStatus(key: string, status: Pol01ChecklistStatus) {
    const next = reconcilePol01Checklist(value, context);
    if (next.entries[key] === status) delete next.entries[key];
    else next.entries[key] = status;
    onChange(next);
  }

  return (
    <section aria-labelledby={headingId} className="min-w-0 space-y-5 text-[var(--ink)]">
      <header>
        <h3 id={headingId} className="text-lg font-bold">
          เช็คลิสต์ใบขอซื้อขอจ้าง (POL-01)
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">
          เลือกประเภทพัสดุ แล้วติ๊กเมื่อได้ตรวจสอบข้อมูลหรือเอกสารของรายการนั้นแล้ว
          การติ๊กไม่ใช่การแนบไฟล์ กรุณาอัปโหลดเอกสารในส่วนด้านล่าง
        </p>
      </header>
      <fieldset disabled={disabled} className="min-w-0">
        <legend className="mb-2 font-semibold">
          ประเภทพัสดุ <span className="font-normal text-stone-600">(เลือกได้มากกว่า 1 ประเภท)</span>
        </legend>
        <div className="grid gap-x-5 sm:grid-cols-2 xl:grid-cols-3">
          {POL01_CHECKLIST_CATEGORIES.map((category) => (
            <label
              key={category.id}
              className="flex min-h-11 cursor-pointer items-center gap-3 py-2 text-sm leading-6"
            >
              <input
                type="checkbox"
                className="size-5 shrink-0 accent-[var(--orange)]"
                checked={value.categories.includes(category.id)}
                onChange={(event) =>
                  onChange(
                    reconcilePol01Checklist(
                      {
                        ...value,
                        categories: event.target.checked
                          ? [...value.categories, category.id]
                          : value.categories.filter((id) => id !== category.id),
                      },
                      context,
                    ),
                  )
                }
              />
              {category.label}
            </label>
          ))}
        </div>
      </fieldset>
      {value.categories.length === 0 && (
        <p className="border border-[var(--line)] bg-[var(--paper-warm)] p-3 text-sm leading-6">
          ยังไม่ได้เลือกประเภทพัสดุ จึงแสดงเฉพาะเอกสารพื้นฐาน
          เลือกประเภทด้านบนเพื่อดูเอกสารเฉพาะที่ควรตรวจสอบ
        </p>
      )}
      <div className="space-y-5">
        {groups.map((group) => (
          <fieldset key={group.id} disabled={disabled} className="min-w-0">
            <legend className="mb-2 font-bold">{group.label}</legend>
            <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {group.items.map((item) => {
                const key = checklistEntryKey(group.id, item.id);
                const status = value.entries[key];
                const notApplicableAction =
                  status === "not_applicable" ? "ยกเลิกไม่เกี่ยวข้อง" : "ไม่เกี่ยวข้อง";
                return (
                  <div
                    key={item.id}
                    className="flex min-w-0 flex-col gap-1 py-2 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <label className="flex min-h-11 min-w-0 flex-1 cursor-pointer items-start gap-3 py-2 text-sm leading-6">
                      <input
                        type="checkbox"
                        className="mt-0.5 size-5 shrink-0 accent-[var(--orange)]"
                        checked={status === "checked"}
                        onChange={() => updateStatus(key, "checked")}
                      />
                      <span className="min-w-0 break-words">
                        {item.label}
                        <span className="mt-0.5 block text-xs text-stone-600">
                          {item.optional ? "ตรวจตามเงื่อนไข / ถ้ามี" : "รายการหลักตามแบบตรวจสอบ"}
                        </span>
                      </span>
                    </label>
                    <div className="flex shrink-0 items-center gap-3 pl-8 text-sm sm:pl-0">
                      <span
                        className={
                          status === "checked"
                            ? "font-semibold text-[var(--green)]"
                            : "text-stone-600"
                        }
                      >
                        {status === "checked"
                          ? "ตรวจแล้ว"
                          : status === "not_applicable"
                            ? "ไม่เกี่ยวข้อง"
                            : "ยังไม่ตรวจ"}
                      </span>
                      {item.optional && (
                        <button
                          type="button"
                          aria-label={`${notApplicableAction}: ${group.label} — ${item.label}`}
                          aria-pressed={status === "not_applicable"}
                          onClick={() => updateStatus(key, "not_applicable")}
                          className={`min-h-11 border px-3 text-sm disabled:cursor-not-allowed ${status === "not_applicable" ? "border-[var(--ink)] bg-[var(--graphite)] text-white hover:bg-[var(--ink)]" : "border-[var(--line-dark)] bg-white hover:bg-[var(--paper-warm)]"}`}
                        >
                          {notApplicableAction}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
      <div className="space-y-1 text-sm leading-6">
        <p role="status" className="font-semibold tabular-nums">
          ตรวจแล้ว {summary.checked} / {summary.total} รายการ · ไม่เกี่ยวข้อง{" "}
          {summary.notApplicable} · ยังไม่ตรวจ {summary.pending}
        </p>
        <p className="max-w-3xl text-stone-600">
          เป็นการตรวจสอบด้วยตนเอง ไม่ใช่ผลตรวจของเจ้าหน้าที่ รายการที่ยังไม่ติ๊กไม่ปิดกั้นการส่งคำขอ
          และไม่บังคับแนบสัญญายืมเงิน เงื่อนไขแนบเอกสารผู้ประกอบการรายใหม่ยังใช้ตามเดิม
        </p>
      </div>
    </section>
  );
}
