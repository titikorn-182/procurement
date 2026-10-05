import type { Pol01ApprovalDetails } from "../pol01";

const fieldClass =
  "min-h-11 w-full border border-[var(--line-dark)] bg-white px-3.5 py-2.5 text-base text-[var(--ink)] outline-none transition placeholder:text-stone-500 hover:border-stone-900 focus:border-[var(--blue)] focus:ring-2 focus:ring-blue-100 sm:text-sm";

type Pol01ApprovalDetailsFieldsProps = {
  value: Pol01ApprovalDetails;
  onChange: (value: Pol01ApprovalDetails) => void;
};

export function Pol01ApprovalDetailsFields({ value, onChange }: Pol01ApprovalDetailsFieldsProps) {
  return (
    <section className="border border-[var(--line-dark)] bg-white" aria-labelledby="pol01-signers">
      <header className="border-b border-[var(--line)] px-5 py-4">
        <h3 id="pol01-signers" className="font-bold text-[var(--ink)]">
          ผู้ลงนามและคณะกรรมการ/ผู้ตรวจรับพัสดุ
        </h3>
        <p className="mt-1 text-sm leading-6 text-stone-600">
          ข้อมูลนี้จะแสดงในเอกสารคำขอหลักการ POL-01 และสามารถแก้ไขให้ตรงกับคำขอแต่ละครั้ง
        </p>
      </header>

      <div className="grid gap-6 p-5 xl:grid-cols-2">
        <fieldset className="min-w-0 border border-[var(--line)] p-4">
          <legend className="px-2 font-bold text-[var(--ink)]">ผู้ขอซื้อ/จ้าง</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">ชื่อ-นามสกุล *</span>
              <input
                className={fieldClass}
                maxLength={200}
                value={value.requester.name}
                onChange={(event) =>
                  onChange({
                    ...value,
                    requester: { ...value.requester, name: event.target.value },
                  })
                }
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">ตำแหน่ง *</span>
              <input
                className={fieldClass}
                maxLength={300}
                value={value.requester.position}
                onChange={(event) =>
                  onChange({
                    ...value,
                    requester: { ...value.requester, position: event.target.value },
                  })
                }
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="min-w-0 border border-[var(--line)] p-4">
          <legend className="px-2 font-bold text-[var(--ink)]">ผู้เห็นชอบ</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">ชื่อ-นามสกุล *</span>
              <input
                className={fieldClass}
                maxLength={200}
                value={value.endorser.name}
                onChange={(event) =>
                  onChange({ ...value, endorser: { ...value.endorser, name: event.target.value } })
                }
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">ตำแหน่ง *</span>
              <input
                className={fieldClass}
                maxLength={300}
                value={value.endorser.position}
                onChange={(event) =>
                  onChange({
                    ...value,
                    endorser: { ...value.endorser, position: event.target.value },
                  })
                }
              />
            </label>
          </div>
        </fieldset>

        <fieldset className="min-w-0 border border-[var(--line)] p-4 xl:col-span-2">
          <legend className="px-2 font-bold text-[var(--ink)]">คณะกรรมการ/ผู้ตรวจรับพัสดุ</legend>
          <div className="grid gap-4 lg:grid-cols-3">
            {value.committee.map((member, index) => (
              <label key={index} className="block">
                <span className="mb-2 block text-sm font-semibold">
                  {index + 1}. {member.role}
                  {index === 0 ? " *" : ""}
                </span>
                <input
                  className={fieldClass}
                  maxLength={200}
                  placeholder={index === 0 ? "ชื่อประธาน/ผู้ตรวจรับ" : "ชื่อกรรมการ (ถ้ามี)"}
                  value={member.name}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      committee: value.committee.map((current, memberIndex) =>
                        memberIndex === index ? { ...current, name: event.target.value } : current,
                      ) as Pol01ApprovalDetails["committee"],
                    })
                  }
                />
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset className="min-w-0 border border-[var(--line)] p-4 xl:col-span-2">
          <legend className="px-2 font-bold text-[var(--ink)]">ผู้อนุมัติ</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">ชื่อ-นามสกุล *</span>
              <input
                className={fieldClass}
                maxLength={200}
                value={value.approver.name}
                onChange={(event) =>
                  onChange({ ...value, approver: { ...value.approver, name: event.target.value } })
                }
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">ตำแหน่ง *</span>
              <input
                className={fieldClass}
                maxLength={300}
                value={value.approver.position}
                onChange={(event) =>
                  onChange({
                    ...value,
                    approver: { ...value.approver, position: event.target.value },
                  })
                }
              />
            </label>
          </div>
        </fieldset>
      </div>
    </section>
  );
}
