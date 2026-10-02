import { FileCheck2, Landmark, Store } from "lucide-react";
import { Field, inputClass } from "../../components/ui";
import { procurementMethods } from "./pol02";
import type { PaymentDetails, SourceRequest } from "./types";

type Props = {
  requests: SourceRequest[];
  requestId: string;
  request: SourceRequest;
  details: PaymentDetails;
  disabled: boolean;
  onRequestChange: (requestId: string) => void;
  onDetailsChange: (next: PaymentDetails) => void;
};

function ReadonlyValue({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-l-2 border-[var(--line)] pl-3">
      <dt className="text-xs font-semibold text-stone-500">{label}</dt>
      <dd className="mt-1 font-semibold text-[var(--ink)]">{value || "—"}</dd>
    </div>
  );
}

export function PaymentReferenceSection({
  requests,
  requestId,
  request,
  details,
  disabled,
  onRequestChange,
  onDetailsChange,
}: Props) {
  const update = <Key extends keyof PaymentDetails>(key: Key, value: PaymentDetails[Key]) =>
    onDetailsChange({ ...details, [key]: value });

  return (
    <>
      <section aria-labelledby="payment-source-heading" className="border-b border-[var(--line)]">
        <div className="flex items-start gap-3 bg-[var(--paper-warm)] px-5 py-4">
          <FileCheck2 className="mt-0.5 text-[var(--orange)]" size={22} aria-hidden="true" />
          <div>
            <h2 id="payment-source-heading" className="text-lg font-bold">
              1. อ้างอิงคำขอและผู้ขอเบิก
            </h2>
            <p className="mt-0.5 text-sm text-stone-600">
              เลือกคำขอหลักการ POL-01 ที่ได้รับอนุมัติแล้ว ระบบจะนำข้อมูลงบประมาณมาให้โดยอัตโนมัติ
            </p>
          </div>
        </div>
        <div className="space-y-5 p-5">
          <Field label="คำขอจัดซื้อจัดจ้างต้นทาง" required>
            <select
              required
              value={requestId}
              disabled={disabled}
              onChange={(event) => onRequestChange(event.target.value)}
              className={inputClass}
            >
              {requests.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.requestNo} — {item.title}
                </option>
              ))}
            </select>
          </Field>
          <dl className="grid gap-4 border border-[var(--line)] bg-white p-4 sm:grid-cols-2 xl:grid-cols-3">
            <ReadonlyValue label="หน่วยงาน/ภาควิชา" value={request.departmentName} />
            <ReadonlyValue label="ผู้ขอเบิก" value={request.requesterName} />
            <ReadonlyValue label="วันที่ได้รับความเห็นชอบ" value={details.approvalDate} />
            <ReadonlyValue label="ปีงบประมาณ" value={String(request.budgetYear)} />
            <ReadonlyValue label="แหล่งเงิน" value={request.fundSource} />
            <ReadonlyValue label="หมวดรายจ่าย" value={request.expenseCategory} />
          </dl>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="md:col-span-2">
              <Field label="เรื่อง/รายการจัดซื้อจัดจ้าง" required>
                <input
                  required
                  maxLength={500}
                  value={details.subject}
                  disabled={disabled}
                  onChange={(event) => update("subject", event.target.value)}
                  className={inputClass}
                />
              </Field>
            </div>
            <Field label="โครงการ/กิจกรรม">
              <input
                maxLength={300}
                value={details.projectActivity}
                disabled={disabled}
                onChange={(event) => update("projectActivity", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="วันที่ได้รับความเห็นชอบ" required>
              <input
                required
                type="date"
                value={details.approvalDate}
                disabled={disabled}
                onChange={(event) => update("approvalDate", event.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </div>
      </section>

      <section aria-labelledby="payment-budget-heading" className="border-b border-[var(--line)]">
        <div className="flex items-start gap-3 bg-[var(--paper-warm)] px-5 py-4">
          <Landmark className="mt-0.5 text-[var(--orange)]" size={22} aria-hidden="true" />
          <div>
            <h2 id="payment-budget-heading" className="text-lg font-bold">
              2. ข้อมูลงบประมาณและการจัดซื้อจัดจ้าง
            </h2>
            <p className="mt-0.5 text-sm text-stone-600">
              ตรวจสอบรหัสงบประมาณจากคำขอต้นทาง และระบุวิธีจัดซื้อจัดจ้างที่ใช้จริง
            </p>
          </div>
        </div>
        <div className="space-y-5 p-5">
          <dl className="grid gap-4 border border-[var(--line)] bg-white p-4 sm:grid-cols-2 xl:grid-cols-4">
            <ReadonlyValue label="รหัสหน่วยงาน" value={request.departmentCode} />
            <ReadonlyValue label="รหัสกองทุน" value={request.fundCode} />
            <ReadonlyValue label="รหัสกิจกรรม" value={request.activityCode} />
            <ReadonlyValue label="แผนงาน" value={request.planName} />
          </dl>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="วิธีจัดซื้อจัดจ้าง" required>
              <select
                required
                value={details.procurementMethod}
                disabled={disabled}
                onChange={(event) => update("procurementMethod", event.target.value)}
                className={inputClass}
              >
                {procurementMethods.map((method) => (
                  <option key={method}>{method}</option>
                ))}
              </select>
            </Field>
            <Field label="เลขที่โครงการ e-GP" hint="เว้นว่างได้หากรายการนี้ไม่มีเลข e-GP">
              <input
                maxLength={100}
                value={details.egpProjectNo}
                disabled={disabled}
                onChange={(event) => update("egpProjectNo", event.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
        </div>
      </section>

      <section aria-labelledby="payment-contract-heading" className="border-b border-[var(--line)]">
        <div className="flex items-start gap-3 bg-[var(--paper-warm)] px-5 py-4">
          <Store className="mt-0.5 text-[var(--orange)]" size={22} aria-hidden="true" />
          <div>
            <h2 id="payment-contract-heading" className="text-lg font-bold">
              3. สัญญา ผู้ขาย และงวดเบิก
            </h2>
            <p className="mt-0.5 text-sm text-stone-600">
              ระบุข้อมูลตามสัญญา ใบสั่งซื้อ หรือใบสั่งจ้างที่ใช้ประกอบการเบิกจ่าย
            </p>
          </div>
        </div>
        <div className="grid gap-5 p-5 md:grid-cols-2">
          <Field label="เลขที่สัญญา/ใบสั่งซื้อ/ใบสั่งจ้าง">
            <input
              maxLength={100}
              value={details.contractNo}
              disabled={disabled}
              onChange={(event) => update("contractNo", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="วันที่สัญญา/ใบสั่ง">
            <input
              type="date"
              value={details.contractDate}
              disabled={disabled}
              onChange={(event) => update("contractDate", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="ผู้ขาย/ผู้รับจ้าง" required>
            <input
              required
              maxLength={300}
              value={details.vendorName}
              disabled={disabled}
              onChange={(event) => update("vendorName", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="เลขประจำตัวผู้เสียภาษี">
            <input
              inputMode="numeric"
              maxLength={20}
              value={details.vendorTaxId}
              disabled={disabled}
              onChange={(event) => update("vendorTaxId", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="วงเงินตามสัญญา (บาท)" required>
            <input
              required
              type="number"
              min="0.01"
              step="0.01"
              value={details.contractAmount}
              disabled={disabled}
              onChange={(event) => update("contractAmount", event.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ขอเบิกงวดที่" required>
              <input
                required
                type="number"
                min="1"
                step="1"
                value={details.installmentNumber}
                disabled={disabled}
                onChange={(event) => update("installmentNumber", event.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="จำนวนงวดทั้งหมด" required>
              <input
                required
                type="number"
                min="1"
                step="1"
                value={details.installmentCount}
                disabled={disabled}
                onChange={(event) => update("installmentCount", event.target.value)}
                className={inputClass}
              />
            </Field>
          </div>
          <Field label="เลขที่ใบแจ้งหนี้/ใบเสร็จหลัก" required>
            <input
              required
              maxLength={100}
              value={details.invoiceNo}
              disabled={disabled}
              onChange={(event) => update("invoiceNo", event.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="วันที่ใบแจ้งหนี้/ใบเสร็จ" required>
            <input
              required
              type="date"
              max={new Date().toISOString().slice(0, 10)}
              value={details.invoiceDate}
              disabled={disabled}
              onChange={(event) => update("invoiceDate", event.target.value)}
              className={inputClass}
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="รายละเอียดการส่งมอบและผลการตรวจรับ" required>
              <textarea
                required
                maxLength={2000}
                value={details.delivery}
                disabled={disabled}
                onChange={(event) => update("delivery", event.target.value)}
                className={`${inputClass} min-h-28 py-3`}
              />
            </Field>
          </div>
        </div>
      </section>
    </>
  );
}
