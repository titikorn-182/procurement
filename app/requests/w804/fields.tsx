"use client";

import type { ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, Field, inputClass } from "@/app/components/ui";
import { formatDocumentMoney as money } from "@/lib/pdf/format";
import { W804_FACULTY, W804_LIMIT, type W804DocumentKind } from "./config";
import { blankItem, blankReceipt, itemTotal, totals, type W804Draft } from "./model";

type Props = { data: W804Draft; onChange: (data: W804Draft) => void };
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
      <h2 className="text-lg font-bold">{title}</h2>
      {hint && <p className="mt-1 max-w-3xl text-sm leading-6 text-stone-600">{hint}</p>}
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}
export function TextField({
  label,
  value,
  onChange,
  multiline = false,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
  type?: "text" | "date";
  required?: boolean;
}) {
  return (
    <Field label={label} required={required}>
      {multiline ? (
        <textarea
          className={`${inputClass} min-h-28 py-3`}
          value={value}
          maxLength={5000}
          rows={3}
          aria-required={required}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          className={inputClass}
          type={type}
          value={value}
          maxLength={500}
          aria-required={required}
          onChange={(e) => onChange(e.target.value)}
        />
      )}
    </Field>
  );
}
function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <input
        className={`${inputClass} tabular-nums`}
        type="number"
        min={0}
        max={1_000_000}
        step="0.01"
        value={value === 0 ? "" : value}
        onChange={(e) =>
          onChange(Number.isFinite(e.target.valueAsNumber) ? e.target.valueAsNumber : 0)
        }
      />
    </Field>
  );
}
const grid = "grid gap-4 sm:grid-cols-2";
export function CommonFields({ data, onChange, kind }: Props & { kind: W804DocumentKind }) {
  return (
    <Section
      title="ข้อมูลบันทึกข้อความ"
      hint={`${W804_FACULTY} · ช่องที่มี * จำเป็นสำหรับการพิมพ์ เลขที่หนังสือให้กรอกตามทะเบียนของหน่วยงาน`}
    >
      <div className={grid}>
        <TextField
          label="เลขที่หนังสือ"
          value={data[kind].number}
          onChange={(number) => onChange({ ...data, [kind]: { ...data[kind], number } })}
        />
        <TextField
          label="วันที่รายงาน"
          type="date"
          required
          value={data[kind].date}
          onChange={(date) => onChange({ ...data, [kind]: { ...data[kind], date } })}
        />
        <TextField
          label="ส่วนงานภายในคณะ"
          required
          value={data.department}
          onChange={(department) => onChange({ ...data, department })}
        />
        <TextField
          label="โทรศัพท์"
          value={data.phone}
          onChange={(phone) => onChange({ ...data, phone })}
        />
      </div>
      <TextField
        label="เรียน"
        required
        value={data.addressee}
        onChange={(addressee) => onChange({ ...data, addressee })}
      />
      <TextField
        label="เรื่อง/ชื่อรายการจัดซื้อ"
        required
        value={data.title}
        onChange={(title) => onChange({ ...data, title })}
      />
    </Section>
  );
}

export function PurchaseFields({ data, onChange }: Props) {
  const updateText = (
    key: keyof Pick<
      W804Draft,
      | "rationale"
      | "objectives"
      | "qualifications"
      | "scope"
      | "quality"
      | "delivery"
      | "payment"
      | "criteria"
      | "penalty"
      | "priceSource"
    >,
    label: string,
    required = false,
  ) => (
    <TextField
      key={key}
      label={label}
      required={required}
      multiline
      value={data[key]}
      onChange={(value) => onChange({ ...data, [key]: value })}
    />
  );
  const requested = totals(data).requested;
  return (
    <>
      <Section
        title="เหตุผลและรายละเอียด TOR"
        hint="ปรับจากหัวข้อในแบบตัวอย่าง เงื่อนไขคุณสมบัติ การชำระเงิน และค่าปรับให้ระบุตามที่หน่วยงานกำหนด ช่องที่ไม่ใช้เว้นว่างได้"
      >
        {updateText("rationale", "หลักการ เหตุผล และความจำเป็น", true)}
        {updateText("objectives", "วัตถุประสงค์", true)}
        {updateText("scope", "รายละเอียดคุณลักษณะเฉพาะและปริมาณงาน", true)}
        {updateText("qualifications", "คุณสมบัติผู้เสนอราคา (ถ้ามี)")}
        {updateText("quality", "คุณภาพและเงื่อนไขของพัสดุ (ถ้ามี)")}
        {updateText("delivery", "กำหนดเวลาและสถานที่ส่งมอบ", true)}
        {updateText("payment", "การชำระเงิน (ถ้ามี)")}
        {updateText("criteria", "หลักเกณฑ์การพิจารณา (ถ้ามี)")}
        {updateText("penalty", "ค่าปรับ/เงื่อนไขอื่นตามที่หน่วยงานกำหนด (ถ้ามี)")}
      </Section>
      <Section
        title="รายการพัสดุและประมาณการค่าใช้จ่าย"
        hint="ระบุราคาต่อหน่วยที่รวมภาษี ค่าขนส่ง และค่าใช้จ่ายทั้งหมดแล้ว วงเงินรวมไม่เกิน 50,000 บาท"
      >
        <div className="divide-y divide-[var(--line)]">
          {data.items.map((item, index) => (
            <fieldset key={index} className="min-w-0 space-y-3 py-4 first:pt-0">
              <legend className="font-bold">รายการที่ {index + 1}</legend>
              <TextField
                label={`ชื่อพัสดุ รายการที่ ${index + 1}`}
                required
                value={item.description}
                onChange={(description) =>
                  onChange({
                    ...data,
                    items: data.items.map((row, i) =>
                      i === index ? { ...row, description } : row,
                    ),
                  })
                }
              />
              <TextField
                label={`คุณลักษณะเฉพาะ รายการที่ ${index + 1}`}
                multiline
                value={item.specification}
                onChange={(specification) =>
                  onChange({
                    ...data,
                    items: data.items.map((row, i) =>
                      i === index ? { ...row, specification } : row,
                    ),
                  })
                }
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <NumberField
                  label={`จำนวน รายการที่ ${index + 1}`}
                  value={item.quantity}
                  onChange={(quantity) =>
                    onChange({
                      ...data,
                      items: data.items.map((row, i) => (i === index ? { ...row, quantity } : row)),
                    })
                  }
                />
                <TextField
                  label={`หน่วย รายการที่ ${index + 1}`}
                  value={item.unit}
                  onChange={(unit) =>
                    onChange({
                      ...data,
                      items: data.items.map((row, i) => (i === index ? { ...row, unit } : row)),
                    })
                  }
                />
                <NumberField
                  label={`ราคา/หน่วย (บาท) รายการที่ ${index + 1}`}
                  value={item.unitPrice}
                  onChange={(unitPrice) =>
                    onChange({
                      ...data,
                      items: data.items.map((row, i) =>
                        i === index ? { ...row, unitPrice } : row,
                      ),
                    })
                  }
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="font-semibold tabular-nums">รวม {money(itemTotal(item))} บาท</p>
                <Button
                  variant="danger"
                  onClick={() =>
                    onChange({ ...data, items: data.items.filter((_, i) => i !== index) })
                  }
                >
                  <Trash2 size={16} aria-hidden="true" /> ลบรายการที่ {index + 1}
                </Button>
              </div>
            </fieldset>
          ))}
        </div>
        <Button
          variant="secondary"
          disabled={data.items.length >= 100}
          onClick={() => onChange({ ...data, items: [...data.items, blankItem()] })}
        >
          <Plus size={16} aria-hidden="true" /> เพิ่มรายการพัสดุ
        </Button>
        <p
          role="status"
          className={`border p-4 font-bold tabular-nums ${requested > W804_LIMIT ? "border-[var(--red)] bg-[var(--red-soft)] text-[var(--red)]" : "border-[var(--line)] bg-[var(--paper-warm)]"}`}
        >
          รวมวงเงินขอซื้อ {money(requested)} บาท
          {requested > W804_LIMIT && " — เกิน 50,000 บาท กรุณาตรวจสอบวงเงิน"}
        </p>
        {updateText("priceSource", "รายละเอียดราคากลาง/แหล่งที่มาของราคา (ถ้ามี)")}
      </Section>
      <Section title="งบประมาณ">
        <div className={grid}>
          <Field label="ปีงบประมาณ พ.ศ.">
            <select
              className={inputClass}
              value={data.budget.fiscalYear}
              onChange={(e) =>
                onChange({ ...data, budget: { ...data.budget, fiscalYear: e.target.value } })
              }
            >
              {Array.from(
                new Set(["2567", "2568", "2569", "2570", "2571", "2572", data.budget.fiscalYear]),
              )
                .sort()
                .map((year) => (
                  <option key={year}>{year}</option>
                ))}
            </select>
          </Field>
          {(
            [
              ["source", "แหล่งเงิน"],
              ["plan", "แผนงาน"],
              ["category", "หมวดรายจ่าย"],
              ["sourceCode", "รหัสแหล่งเงิน"],
              ["departmentCode", "รหัสหน่วยงาน"],
              ["fundCode", "รหัสกองทุน"],
              ["activityCode", "รหัสกิจกรรม"],
            ] as const
          ).map(([key, label]) => (
            <TextField
              key={key}
              label={label}
              required={key === "source" || key === "plan"}
              value={data.budget[key]}
              onChange={(value) => onChange({ ...data, budget: { ...data.budget, [key]: value } })}
            />
          ))}
        </div>
      </Section>
      <Section
        title="ผู้กำหนดรายละเอียดคุณลักษณะเฉพาะ"
        hint="ระบุเฉพาะผู้ได้รับมอบหมายจริง เว้นว่างได้หากยังไม่กำหนด ไม่คัดลอกชื่อบุคคลจากตัวอย่าง"
      >
        {data.torAuthors.map((person, index) => (
          <div key={index} className={grid}>
            <TextField
              label={`ชื่อ-นามสกุล ผู้กำหนด TOR ${index + 1}`}
              value={person.name}
              onChange={(name) =>
                onChange({
                  ...data,
                  torAuthors: data.torAuthors.map((row, i) =>
                    i === index ? { ...row, name } : row,
                  ),
                })
              }
            />
            <TextField
              label={`ตำแหน่ง/หน้าที่ ผู้กำหนด TOR ${index + 1}`}
              value={person.position}
              onChange={(position) =>
                onChange({
                  ...data,
                  torAuthors: data.torAuthors.map((row, i) =>
                    i === index ? { ...row, position } : row,
                  ),
                })
              }
            />
          </div>
        ))}
      </Section>
    </>
  );
}

export function ResultsFields({
  data,
  onChange,
  kind,
}: Props & { kind: "summary" | "settlement" }) {
  const { spent, budgetBalance, loanBalance } = totals(data);
  return (
    <>
      <Section
        title="อ้างอิงรายงานขอซื้อที่ได้รับความเห็นชอบ"
        hint="กรอกจากเอกสารที่ได้รับความเห็นชอบจริง ระบบไม่ได้ตรวจสอบหรือรับรองการอนุมัติ"
      >
        <div className={grid}>
          <TextField
            label="เลขที่รายงานขอซื้อที่ได้รับความเห็นชอบ"
            required
            value={data.approvalNumber}
            onChange={(approvalNumber) => onChange({ ...data, approvalNumber })}
          />
          <TextField
            label="วันที่ได้รับความเห็นชอบ"
            required
            type="date"
            value={data.approvalDate}
            onChange={(approvalDate) => onChange({ ...data, approvalDate })}
          />
          <NumberField
            label="วงเงินที่ได้รับความเห็นชอบ (บาท)"
            value={data.approvedAmount}
            onChange={(approvedAmount) => onChange({ ...data, approvedAmount })}
          />
        </div>
      </Section>
      <Section
        title="ผลการจัดซื้อและหลักฐานการจ่าย"
        hint="ข้อมูลส่วนนี้ใช้ร่วมกันระหว่างรายงานสรุปผลและรายงานส่งใช้เงินยืม รองรับหลายร้านค้าและหลายใบเสร็จ"
      >
        {data.receipts.map((row, index) => (
          <fieldset key={index} className="min-w-0 space-y-3 border-b border-[var(--line)] pb-5">
            <legend className="font-bold">หลักฐานที่ {index + 1}</legend>
            <div className={grid}>
              {(
                [
                  ["vendor", "ชื่อผู้ประกอบการ/ร้านค้า"],
                  ["number", "เลขที่ใบเสร็จ/หลักฐาน"],
                  ["date", "วันที่ซื้อ"],
                  ["quantity", "จำนวนและหน่วยที่ซื้อ"],
                ] as const
              ).map(([key, label]) => (
                <TextField
                  key={key}
                  label={`${label} หลักฐานที่ ${index + 1}`}
                  required
                  type={key === "date" ? "date" : "text"}
                  value={row[key]}
                  onChange={(value) =>
                    onChange({
                      ...data,
                      receipts: data.receipts.map((receipt, i) =>
                        i === index ? { ...receipt, [key]: value } : receipt,
                      ),
                    })
                  }
                />
              ))}
            </div>
            <TextField
              label={`รายการที่ซื้อ หลักฐานที่ ${index + 1}`}
              required
              multiline
              value={row.description}
              onChange={(description) =>
                onChange({
                  ...data,
                  receipts: data.receipts.map((receipt, i) =>
                    i === index ? { ...receipt, description } : receipt,
                  ),
                })
              }
            />
            <div className="flex flex-wrap items-end justify-between gap-3">
              <NumberField
                label={`ยอดเงิน (บาท) หลักฐานที่ ${index + 1}`}
                value={row.amount}
                onChange={(amount) =>
                  onChange({
                    ...data,
                    receipts: data.receipts.map((receipt, i) =>
                      i === index ? { ...receipt, amount } : receipt,
                    ),
                  })
                }
              />
              <Button
                variant="danger"
                onClick={() =>
                  onChange({ ...data, receipts: data.receipts.filter((_, i) => i !== index) })
                }
              >
                <Trash2 size={16} aria-hidden="true" /> ลบหลักฐานที่ {index + 1}
              </Button>
            </div>
          </fieldset>
        ))}
        <Button
          variant="secondary"
          disabled={data.receipts.length >= 100}
          onClick={() => onChange({ ...data, receipts: [...data.receipts, blankReceipt()] })}
        >
          <Plus size={16} aria-hidden="true" /> เพิ่มหลักฐานการซื้อ
        </Button>
        <div
          role="status"
          className="border border-[var(--line)] bg-[var(--paper-warm)] p-4 leading-7 tabular-nums"
        >
          <p className="font-bold">ยอดซื้อจริง {money(spent)} บาท</p>
          <p className={budgetBalance < 0 ? "font-semibold text-[var(--red)]" : ""}>
            {budgetBalance < 0 ? "เกินวงเงินที่ได้รับความเห็นชอบ" : "วงเงินที่ยังไม่ใช้"}{" "}
            {money(Math.abs(budgetBalance))} บาท
          </p>
        </div>
        <TextField
          label="ผลการตรวจสอบรายการ จำนวน ราคา และการรับมอบพัสดุ (กรอกตามจริง)"
          multiline
          value={data.inspection}
          onChange={(inspection) => onChange({ ...data, inspection })}
        />
      </Section>
      {kind === "settlement" && (
        <Section
          title="ข้อมูลเงินยืมและการส่งใช้"
          hint="ยอดเงินคงเหลือคำนวณจากเงินยืม หักยอดซื้อจริง ไม่ใช่หลักฐานว่างานการเงินรับคืนเงินแล้ว"
        >
          <div className={grid}>
            <TextField
              label="เลขที่สัญญายืมเงิน"
              required
              value={data.loanNumber}
              onChange={(loanNumber) => onChange({ ...data, loanNumber })}
            />
            <TextField
              label="วันที่สัญญายืมเงิน"
              required
              type="date"
              value={data.loanDate}
              onChange={(loanDate) => onChange({ ...data, loanDate })}
            />
            <NumberField
              label="จำนวนเงินยืม (บาท)"
              value={data.loanAmount}
              onChange={(loanAmount) => onChange({ ...data, loanAmount })}
            />
            <TextField
              label="เลขที่หลักฐานคืนเงิน (ถ้ามี)"
              value={data.returnEvidence}
              onChange={(returnEvidence) => onChange({ ...data, returnEvidence })}
            />
          </div>
          <p
            role="status"
            className={`border p-4 font-bold tabular-nums ${loanBalance < 0 ? "border-[var(--red)] bg-[var(--red-soft)] text-[var(--red)]" : "border-[var(--line)] bg-[var(--paper-warm)]"}`}
          >
            {loanBalance < 0 ? "ใช้จ่ายเกินเงินยืม" : "เงินคงเหลือที่ขอส่งคืน"}{" "}
            {money(Math.abs(loanBalance))} บาท
          </p>
        </Section>
      )}
    </>
  );
}

export function SignatureFields({ data, onChange }: Props) {
  return (
    <Section
      title="ผู้จัดทำและช่องเสนอความเห็น"
      hint="ชื่อและตำแหน่งใช้ร่วมกันทั้ง 3 รายงาน ช่องผู้เสนอความเห็นและผู้พิจารณาเว้นว่างได้ ไม่ได้กำหนดสิทธิ์หรือสายอนุมัติในระบบ"
    >
      <div className={grid}>
        <TextField
          label="ชื่อ-นามสกุล ผู้จัดทำ/ผู้รับผิดชอบ"
          required
          value={data.preparer.name}
          onChange={(name) => onChange({ ...data, preparer: { ...data.preparer, name } })}
        />
        <TextField
          label="ตำแหน่ง ผู้จัดทำ/ผู้รับผิดชอบ"
          required
          value={data.preparer.position}
          onChange={(position) => onChange({ ...data, preparer: { ...data.preparer, position } })}
        />
        {data.reviewers.map((person, index) => (
          <div key={index} className="space-y-3">
            <TextField
              label={`ชื่อ-นามสกุล ${index === 0 ? "ผู้ตรวจสอบ/ผู้เสนอความเห็น" : "ผู้พิจารณา"}`}
              value={person.name}
              onChange={(name) =>
                onChange({
                  ...data,
                  reviewers: data.reviewers.map((row, i) => (i === index ? { ...row, name } : row)),
                })
              }
            />
            <TextField
              label={`ตำแหน่ง ${index === 0 ? "ผู้ตรวจสอบ/ผู้เสนอความเห็น" : "ผู้พิจารณา"}`}
              value={person.position}
              onChange={(position) =>
                onChange({
                  ...data,
                  reviewers: data.reviewers.map((row, i) =>
                    i === index ? { ...row, position } : row,
                  ),
                })
              }
            />
          </div>
        ))}
      </div>
      <TextField
        label="รายการเอกสารแนบและจำนวนฉบับ/ชุด (ระบุตามจริง)"
        multiline
        value={data.attachmentNotes}
        onChange={(attachmentNotes) => onChange({ ...data, attachmentNotes })}
      />
    </Section>
  );
}
