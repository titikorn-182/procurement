"use client";

import { useId, type ReactNode } from "react";

export type DocumentChecklistStatus = "checked" | "not_applicable";
export type DocumentChecklistGroup = {
  id: string;
  label: string;
  items: readonly { id: string; label: string; optional?: boolean }[];
};

export function DocumentChecklistFields<Category extends string>({
  title,
  description,
  footer,
  categories,
  selectedCategories,
  groups,
  entries,
  onCategoriesChange,
  onStatusChange,
  disabled = false,
}: {
  title: string;
  description: ReactNode;
  footer: ReactNode;
  categories: readonly { id: Category; label: string }[];
  selectedCategories: readonly Category[];
  groups: readonly DocumentChecklistGroup[];
  entries: Readonly<Record<string, DocumentChecklistStatus>>;
  onCategoriesChange: (categories: Category[]) => void;
  onStatusChange: (key: string, status: DocumentChecklistStatus) => void;
  disabled?: boolean;
}) {
  const headingId = useId();
  const visibleStatuses = groups.flatMap((group) =>
    group.items.map((item) => entries[group.id + "." + item.id]),
  );
  const summary = {
    total: visibleStatuses.length,
    checked: visibleStatuses.filter((status) => status === "checked").length,
    notApplicable: visibleStatuses.filter((status) => status === "not_applicable").length,
    pending: visibleStatuses.filter((status) => !status).length,
  };

  return (
    <section aria-labelledby={headingId} className="min-w-0 space-y-5 text-[var(--ink)]">
      <header>
        <h3 id={headingId} className="text-lg font-bold">
          {title}
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-stone-600">{description}</p>
      </header>
      <fieldset disabled={disabled} className="min-w-0">
        <legend className="mb-2 font-semibold">
          ประเภทพัสดุ <span className="font-normal text-stone-600">(เลือกได้มากกว่า 1 ประเภท)</span>
        </legend>
        <div className="grid gap-x-5 sm:grid-cols-2 xl:grid-cols-3">
          {categories.map((category) => (
            <label
              key={category.id}
              className="flex min-h-11 cursor-pointer items-center gap-3 py-2 text-sm leading-6"
            >
              <input
                type="checkbox"
                className="size-5 shrink-0 accent-[var(--orange)]"
                checked={selectedCategories.includes(category.id)}
                onChange={(event) =>
                  onCategoriesChange(
                    event.target.checked
                      ? [...selectedCategories, category.id]
                      : selectedCategories.filter((id) => id !== category.id),
                  )
                }
              />
              {category.label}
            </label>
          ))}
        </div>
      </fieldset>
      {selectedCategories.length === 0 && (
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
                const key = `${group.id}.${item.id}`;
                const status = entries[key];
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
                        onChange={() => onStatusChange(key, "checked")}
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
                          onClick={() => onStatusChange(key, "not_applicable")}
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
        <p className="max-w-3xl text-stone-600">{footer}</p>
      </div>
    </section>
  );
}
