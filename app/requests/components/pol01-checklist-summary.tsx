import {
  checklistEntryKey,
  getPol01ChecklistGroups,
  summarizePol01Checklist,
  type Pol01Checklist,
  type Pol01ChecklistContext,
} from "../pol01-checklist";

export function Pol01ChecklistSummary({
  value,
  context,
}: {
  value: Pol01Checklist;
  context: Pol01ChecklistContext;
}) {
  const summary = summarizePol01Checklist(value, context);
  return (
    <details className="min-w-0 border border-[var(--line)] bg-[var(--paper)]">
      <summary className="cursor-pointer p-4 font-semibold leading-6 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]">
        เช็คลิสต์ POL-01: ตรวจแล้ว {summary.checked} / {summary.total} รายการ
        <span className="mt-1 block text-sm font-normal text-stone-600">
          ไม่เกี่ยวข้อง {summary.notApplicable} · ยังไม่ตรวจ {summary.pending} ·
          เปิดดูผลตรวจด้วยตนเอง
        </span>
      </summary>
      <div className="space-y-4 border-t border-[var(--line)] p-4 text-sm leading-6">
        <p className="text-stone-600">
          ผู้ยื่นเป็นผู้ระบุสถานะ ไม่ใช่ผลตรวจหรือการอนุมัติของเจ้าหน้าที่
        </p>
        {value.categories.length === 0 && <p>ยังไม่ได้เลือกประเภทพัสดุ</p>}
        {getPol01ChecklistGroups(value.categories, context).map((group) => (
          <section key={group.id}>
            <h4 className="font-bold">{group.label}</h4>
            <ul className="mt-2 divide-y divide-[var(--line)]">
              {group.items.map((item) => {
                const status = value.entries[checklistEntryKey(group.id, item.id)];
                return (
                  <li
                    key={item.id}
                    className="flex flex-col gap-1 py-2 sm:flex-row sm:justify-between sm:gap-4"
                  >
                    <span className="min-w-0 break-words">{item.label}</span>
                    <span className="shrink-0 font-semibold">
                      {status === "checked"
                        ? "ตรวจแล้ว"
                        : status === "not_applicable"
                          ? "ไม่เกี่ยวข้อง"
                          : "ยังไม่ตรวจ"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </details>
  );
}
