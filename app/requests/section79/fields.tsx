"use client";

import type { ReactNode } from "react";
import { Field, inputClass } from "@/app/components/ui";
import { toThaiBahtText } from "@/app/payments/new/pol02";
import { SECTION79_LIMIT, SIGNATORY_ROLES, type Section79Draft } from "./model";
import styles from "./fields.module.css";

type Props = { data: Section79Draft; onChange: (data: Section79Draft) => void };

export function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-[var(--line)] py-6 last:border-b-0">
      <h3 className="text-lg font-bold">{title}</h3>
      {hint && <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-600">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function TextField({
  label,
  value,
  onChange,
  required = false,
  multiline = false,
  placeholder,
  type = "text",
  maxLength = 500,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  multiline?: boolean;
  placeholder?: string;
  type?: "text" | "date";
  maxLength?: number;
}) {
  return (
    <Field label={label} required={required}>
      {multiline ? (
        <textarea
          className={`${inputClass} min-h-28 py-3`}
          value={value}
          rows={3}
          maxLength={maxLength}
          aria-required={required}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={`${inputClass} min-w-0`}
          type={type}
          value={value}
          maxLength={maxLength}
          aria-required={required}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}

export function IncidentFields({ data, onChange }: Props) {
  const set = (key: keyof Section79Draft, value: string) => onChange({ ...data, [key]: value });
  return (
    <div className={styles.incident}>
      <Section
        title="ข้อมูลบันทึกข้อความ"
        hint="ช่องที่มี * จำเป็นก่อนพิมพ์ เลขที่หนังสือให้กรอกตามทะเบียนของหน่วยงาน"
      >
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="min-w-0 space-y-4 xl:space-y-2">
            <TextField
              label="ส่วนงาน"
              required
              value={data.department}
              onChange={(v) => set("department", v)}
            />
            <div className={`grid gap-4 sm:grid-cols-2 ${styles.compactPair}`}>
              <TextField label="โทรศัพท์" value={data.phone} onChange={(v) => set("phone", v)} />
              <TextField
                label="เลขที่หนังสือ"
                value={data.memoNumber}
                onChange={(v) => set("memoNumber", v)}
              />
            </div>
            <TextField
              label="วันที่รายงาน"
              required
              type="date"
              value={data.memoDate}
              onChange={(v) => set("memoDate", v)}
            />
            <TextField
              label="เรียน"
              required
              value={data.addressee}
              onChange={(v) => set("addressee", v)}
            />
            <TextField
              label="ชื่อเจ้าหน้าที่ผู้รับผิดชอบ"
              required
              value={data.requester.name}
              placeholder="ชื่อและนามสกุล"
              onChange={(name) => onChange({ ...data, requester: { ...data.requester, name } })}
            />
            <TextField
              label="ตำแหน่งเจ้าหน้าที่ผู้รับผิดชอบ"
              required
              value={data.requester.position}
              onChange={(position) =>
                onChange({ ...data, requester: { ...data.requester, position } })
              }
            />
          </div>
          <div className="min-w-0 space-y-4 xl:space-y-2">
            <Field label="ประเภทการจัดซื้อ/จัดจ้าง" required>
              <select
                className={inputClass}
                value={data.kind}
                onChange={(e) =>
                  onChange({ ...data, kind: e.target.value as Section79Draft["kind"] })
                }
              >
                <option value="purchase">จัดซื้อ</option>
                <option value="hire">จัดจ้าง</option>
              </select>
            </Field>
            <TextField
              label="รายการที่ได้จัดซื้อ/จัดจ้าง"
              required
              multiline
              maxLength={5000}
              value={data.description}
              placeholder="ระบุรายการและรายละเอียดที่ดำเนินการจริง"
              onChange={(v) => set("description", v)}
            />
            <TextField
              label="ร้านค้า/ผู้ประกอบการ"
              required
              value={data.vendor}
              onChange={(v) => set("vendor", v)}
            />
            <TextField
              label="เรื่อง"
              required
              multiline
              value={data.subject}
              onChange={(v) => set("subject", v)}
            />
          </div>
        </div>
      </Section>
      <Section
        title="เหตุจำเป็นเร่งด่วน"
        hint="อธิบายเหตุที่ไม่ได้คาดหมายไว้ก่อน และเหตุที่ไม่อาจดำเนินการจัดซื้อจัดจ้างตามปกติได้ทัน ตามข้อเท็จจริง"
      >
        <TextField
          label="เหตุผลและความจำเป็นเร่งด่วน"
          required
          multiline
          maxLength={5000}
          value={data.urgentReason}
          placeholder="ระบุเหตุการณ์ ความจำเป็น และผลกระทบหากรอดำเนินการตามปกติ"
          onChange={(v) => set("urgentReason", v)}
        />
      </Section>
      <Section title="หลักฐานการจัดซื้อ/จัดจ้าง">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="ประเภทหลักฐาน" required>
            <select
              className={inputClass}
              value={data.receipt.kind}
              onChange={(e) =>
                onChange({
                  ...data,
                  receipt: {
                    ...data.receipt,
                    kind: e.target.value as Section79Draft["receipt"]["kind"],
                  },
                })
              }
            >
              <option value="receipt">ใบเสร็จรับเงิน</option>
              <option value="delivery">ใบส่งของ</option>
            </select>
          </Field>
          <TextField
            label="เล่มที่ (ถ้ามี)"
            value={data.receipt.book}
            onChange={(book) => onChange({ ...data, receipt: { ...data.receipt, book } })}
          />
          <TextField
            label="เลขที่หลักฐาน"
            required
            value={data.receipt.number}
            onChange={(number) => onChange({ ...data, receipt: { ...data.receipt, number } })}
          />
          <TextField
            label="วันที่หลักฐาน"
            required
            type="date"
            value={data.receipt.date}
            onChange={(date) => onChange({ ...data, receipt: { ...data.receipt, date } })}
          />
        </div>
      </Section>
    </div>
  );
}

export function BudgetFields({ data, onChange }: Props) {
  const setBudget = (key: keyof Section79Draft["budget"], value: string) =>
    onChange({ ...data, budget: { ...data.budget, [key]: value } });
  return (
    <>
      <Section
        title="จำนวนเงินและผู้รับเงิน"
        hint="แบบฟอร์มต้นฉบับกำหนดวงเงินไม่เกิน 500,000 บาท การจัดทำเอกสารไม่ใช่การรับรองสิทธิ์หรือการอนุมัติเบิกจ่าย"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="จำนวนเงินที่ขอเบิกจ่าย (บาท)" required>
            <input
              className={`${inputClass} tabular-nums`}
              type="number"
              inputMode="decimal"
              min={0.01}
              max={SECTION79_LIMIT}
              step="0.01"
              value={data.amount ?? ""}
              placeholder="เช่น 1500.00"
              aria-required="true"
              onChange={(e) =>
                onChange({
                  ...data,
                  amount: Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : null,
                })
              }
            />
          </Field>
          <TextField
            label="สั่งจ่ายให้แก่"
            required
            value={data.payee}
            placeholder="ชื่อบุคคลหรือผู้ประกอบการที่รับเงิน"
            onChange={(payee) => onChange({ ...data, payee })}
          />
        </div>
        <p className="text-sm" aria-live="polite">
          จำนวนเงินตัวอักษร:{" "}
          {data.amount !== null && data.amount > 0 && data.amount <= SECTION79_LIMIT
            ? toThaiBahtText(data.amount)
            : "จะแสดงเมื่อกรอกจำนวนเงิน"}
        </p>
      </Section>
      <Section title="งบประมาณที่ใช้เบิกจ่าย">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="ปีงบประมาณ พ.ศ."
            required
            value={data.budget.fiscalYear}
            maxLength={4}
            placeholder="เช่น 2570"
            onChange={(v) => setBudget("fiscalYear", v)}
          />
          <Field label="แหล่งเงิน" required>
            <select
              className={inputClass}
              value={data.budget.source}
              onChange={(e) => setBudget("source", e.target.value)}
              aria-required="true"
            >
              <option value="">เลือกแหล่งเงิน</option>
              <option value="งบประมาณเงินรายได้">งบประมาณเงินรายได้</option>
              <option value="งบประมาณเงินอุดหนุน">งบประมาณเงินอุดหนุน</option>
              {data.budget.source &&
                !["งบประมาณเงินรายได้", "งบประมาณเงินอุดหนุน"].includes(data.budget.source) && (
                  <option value={data.budget.source}>{data.budget.source}</option>
                )}
            </select>
          </Field>
          <TextField
            label="กองทุน"
            required
            value={data.budget.fund}
            onChange={(v) => setBudget("fund", v)}
          />
          <TextField
            label="กิจกรรม"
            required
            value={data.budget.activity}
            onChange={(v) => setBudget("activity", v)}
          />
        </div>
        <TextField
          label="งาน/โครงการ"
          required
          value={data.budget.project}
          onChange={(v) => setBudget("project", v)}
        />
      </Section>
      <Section
        title="รหัสงบประมาณตามแบบฟอร์ม"
        hint="กรอกตามข้อมูลที่งานการเงินยืนยัน ตัวเลขสีเทาเป็นเพียงตัวอย่าง ไม่บันทึกเป็นค่าจริง"
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {(
            [
              ["sourceCode", "รหัสแหล่งเงิน", "เช่น 2"],
              ["departmentCode", "รหัสหน่วยงาน", "เช่น 2301"],
              ["fundCode", "รหัสกองทุน", "เช่น 1"],
              ["activityCode", "รหัสกิจกรรม", "เช่น 510252000001"],
            ] as const
          ).map(([key, label, placeholder]) => (
            <TextField
              key={key}
              label={label}
              value={data.budget[key]}
              placeholder={placeholder}
              maxLength={30}
              onChange={(v) => setBudget(key, v)}
            />
          ))}
        </div>
      </Section>
    </>
  );
}

export function SignatoryFields({ data, onChange }: Props) {
  return (
    <Section
      title="ผู้ลงนามในแบบฟอร์ม"
      hint="แก้ไขชื่อและตำแหน่งให้ตรงกับผู้ปฏิบัติหน้าที่จริง เว้นชื่อไว้ได้ ระบบไม่ลงลายมือชื่อ ไม่เลือกผลพิจารณา และไม่บันทึกว่าอนุมัติแล้ว"
    >
      <div className="grid gap-x-6 sm:grid-cols-2">
        {SIGNATORY_ROLES.map((label, index) => (
          <fieldset key={label} className="min-w-0 space-y-4 border-t border-[var(--line)] py-5">
            <legend className="pr-2 font-semibold">
              ({index + 1}) {label}
            </legend>
            <TextField
              label={`ชื่อผู้ลงนาม ส่วนที่ ${index + 1}`}
              value={data.signatories[index].name}
              onChange={(name) =>
                onChange({
                  ...data,
                  signatories: data.signatories.map((person, i) =>
                    i === index ? { ...person, name } : person,
                  ),
                })
              }
            />
            <TextField
              label={`ตำแหน่งผู้ลงนาม ส่วนที่ ${index + 1}`}
              multiline
              value={data.signatories[index].position}
              onChange={(position) =>
                onChange({
                  ...data,
                  signatories: data.signatories.map((person, i) =>
                    i === index ? { ...person, position } : person,
                  ),
                })
              }
            />
          </fieldset>
        ))}
      </div>
    </Section>
  );
}
