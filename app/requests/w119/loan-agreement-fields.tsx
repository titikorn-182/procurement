"use client";

import type { LoanAgreement } from "./loan-agreement";
import { loanDueDate } from "./loan-agreement";
import { formatThaiDocumentDate, formatDocumentMoney } from "@/lib/pdf/format";

/* THESIS: extend step 4 with the supplied loan contract, not a separate workflow.
 * OWN-WORLD: inherit orange/paper controls; printed black ruled A4, TH SarabunPSK.
 * STORY: opt in, enter borrower and transfer details, inspect the generated contract.
 * FIRST VIEWPORT: checkbox then purpose, total and grouped labeled fields.
 * FORM: supplied POL-2569 template is the explicit composition authority; no concept roll.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
 */
const control =
  "mt-1 min-h-11 w-full min-w-0 border border-[var(--line-dark)] bg-white px-3 py-2 text-sm text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]";
type TextField = Exclude<keyof LoanAgreement, "projectType">;

export function LoanAgreementFields({
  value,
  onChange,
  total,
}: {
  value: LoanAgreement;
  onChange: (value: LoanAgreement) => void;
  total: number;
}) {
  function field(
    key: TextField,
    label: string,
    maxLength: number,
    type = "text",
    optional = false,
  ) {
    return (
      <label className="block min-w-0 text-sm font-medium" key={key}>
        {label}
        {optional ? " (ถ้ามี)" : " *"}
        <input
          className={control}
          type={type}
          value={value[key]}
          maxLength={maxLength}
          required={!optional}
          autoComplete="off"
          inputMode={key === "accountNumber" ? "numeric" : undefined}
          onChange={(event) => onChange({ ...value, [key]: event.target.value })}
        />
      </label>
    );
  }
  return (
    <section
      aria-labelledby="loan-agreement-heading"
      className="space-y-6 border-y border-[var(--line)] py-6"
    >
      <div>
        <h3 id="loan-agreement-heading" className="text-lg font-bold">
          สัญญาการยืมเงิน
        </h3>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--muted)]">
          กรอกข้อมูลตามแบบสัญญา POL-2569 ระบบนำรายการพัสดุและยอดรวม {formatDocumentMoney(total)} บาท
          ไปจัดทำสัญญาต่อท้าย ว119 โดยไม่ต้องอัปโหลดสัญญาที่ระบบสร้างซ้ำ ช่องที่มี * ต้องกรอก
        </p>
        <p className="mt-1 text-sm text-[var(--muted)]">
          การจัดทำเอกสารนี้ไม่ใช่การอนุมัติยืมหรือการจ่ายเงิน
          ช่องลงนามและรายการส่งใช้เงินยืมจะเว้นว่างไว้
        </p>
      </div>
      <fieldset className="min-w-0">
        <legend className="mb-3 font-semibold">ข้อมูลผู้ยืม</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("borrowerName", "ชื่อ-นามสกุลผู้ยืม", 200)}
          {field("borrowerPosition", "ตำแหน่ง", 200)}
          {field("affiliation", "สังกัด", 300)}
          {field("contractNo", "เลขที่สัญญา รศ.", 100, "text", true)}
        </div>
      </fieldset>
      <fieldset className="min-w-0">
        <legend className="mb-3 font-semibold">โครงการหรือกิจกรรม</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm font-medium">
            ประเภท *
            <select
              className={control}
              value={value.projectType}
              onChange={(event) =>
                onChange({
                  ...value,
                  projectType: event.target.value === "activity" ? "activity" : "project",
                })
              }
            >
              <option value="project">โครงการ</option>
              <option value="activity">กิจกรรม</option>
            </select>
          </label>
          {field("projectName", "ชื่อโครงการหรือกิจกรรม", 300)}
          <label className="block text-sm font-medium sm:col-span-2">
            รายละเอียดค่าใช้จ่าย / วัตถุประสงค์ *
            <textarea
              className={control}
              rows={3}
              maxLength={1000}
              value={value.purpose}
              required
              onChange={(event) => onChange({ ...value, purpose: event.target.value })}
            />
          </label>
          {field("endDate", "วันสิ้นสุดโครงการหรือกิจกรรม", 10, "date")}
          <div className="text-sm">
            <p className="font-medium">วันครบกำหนดส่งใช้เงินยืม</p>
            <p className="mt-3 font-semibold" aria-live="polite">
              {formatThaiDocumentDate(loanDueDate(value.endDate)) || "ระบุวันสิ้นสุดเพื่อคำนวณ"}
            </p>
            <p className="mt-1 text-[var(--muted)]">
              คำนวณ 15 วันถัดจากวันสิ้นสุด ตามแบบที่แนบ โปรดตรวจสอบกับงานการเงิน
            </p>
          </div>
        </div>
      </fieldset>
      <fieldset className="min-w-0">
        <legend className="mb-3 font-semibold">ข้อมูลรับโอนเงิน</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {field("accountName", "ชื่อบัญชี", 200)}
          {field("accountNumber", "เลขที่บัญชี", 40)}
          {field("bankName", "ธนาคาร", 200)}
          {field("transferDate", "โปรดโอนเงินภายในวันที่", 10, "date")}
          {field("transferPurpose", "วัตถุประสงค์การโอนเงิน", 300)}
        </div>
      </fieldset>
    </section>
  );
}
