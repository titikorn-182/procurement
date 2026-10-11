import { money } from "./constants";
import type { W119FormController } from "./use-w119-form";
type Props = Pick<
  W119FormController,
  | "requestType"
  | "title"
  | "rationale"
  | "documentNo"
  | "memoDate"
  | "addressee"
  | "requiredDate"
  | "items"
  | "fundSource"
  | "total"
  | "selectionCriteria"
  | "sourceCode"
  | "departmentCode"
  | "fundCode"
  | "planCode"
  | "advanceRequired"
  | "loanAgreement"
  | "attachmentCount"
  | "initial"
  | "retainedAttachments"
  | "attachments"
  | "pendingRemovalAttachments"
>;
export function ReviewStep({
  requestType,
  title,
  rationale,
  documentNo,
  memoDate,
  addressee,
  requiredDate,
  items,
  fundSource,
  total,
  selectionCriteria,
  sourceCode,
  departmentCode,
  fundCode,
  planCode,
  advanceRequired,
  loanAgreement,
  attachmentCount,
  initial,
  retainedAttachments,
  attachments,
  pendingRemovalAttachments,
}: Props) {
  return (
    <div className="space-y-5">
      <div className="border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-orange-600">
          {requestType === "purchase" ? "คำขอจัดซื้อ" : "คำขอจัดจ้าง"} · ว119
        </p>
        <h3 className="mt-2 text-lg font-bold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{rationale}</p>
        <p className="mt-4 border-t border-slate-200 pt-3 text-sm text-slate-600">
          {documentNo} · ลงวันที่ {memoDate} · เรียน {addressee}
        </p>
      </div>
      <dl className="grid gap-4 sm:grid-cols-2">
        <div>
          <dt className="text-sm text-slate-500">วันที่ต้องการใช้</dt>
          <dd className="mt-1 font-semibold text-slate-900">{requiredDate}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">จำนวนรายการ</dt>
          <dd className="mt-1 font-semibold text-slate-900">{items.length} รายการ</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">แหล่งเงิน</dt>
          <dd className="mt-1 font-semibold text-slate-900">{fundSource}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">ยอดรวม</dt>
          <dd className="mt-1 text-xl font-bold text-orange-700">{money(total)}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">หลักเกณฑ์คัดเลือก</dt>
          <dd className="mt-1 font-semibold text-slate-900">{selectionCriteria}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">รหัสงบประมาณ</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {sourceCode} / {departmentCode} / {fundCode} / {planCode}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">การยืมเงินทดรองราชการ</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {advanceRequired ? "ประสงค์ยืมเงิน" : "ไม่ประสงค์ยืมเงิน"}
            {advanceRequired && (
              <span className="mt-1 block text-sm font-normal">
                ผู้ยืม {loanAgreement.borrowerName} · สัญญาจะต่อท้ายแบบฟอร์ม ว119
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">เอกสารแนบ</dt>
          <dd className="mt-1 font-semibold text-slate-900">
            {attachmentCount} ไฟล์
            {initial && ` (เดิม ${retainedAttachments.length} / เพิ่มใหม่ ${attachments.length})`}
          </dd>
        </div>
      </dl>
      {pendingRemovalAttachments.length > 0 && (
        <section
          aria-label="ตรวจสอบเอกสารที่จะลบ"
          className="border border-[var(--red)] bg-[var(--red-soft)] p-4 text-[var(--red)]"
        >
          <h3 className="font-bold">เอกสารที่จะลบ {pendingRemovalAttachments.length} ไฟล์</h3>
          <ul className="mt-2 list-inside list-disc break-words [overflow-wrap:anywhere]">
            {pendingRemovalAttachments.map((file) => (
              <li key={file.id}>{file.fileName}</li>
            ))}
          </ul>
          <p className="mt-2 text-sm">
            เมื่อกด “บันทึกการแก้ไขและส่งใหม่” ระบบจะลบไฟล์ที่เลือก หากส่งคำขอใหม่ไม่สำเร็จ
            ไฟล์ที่ลบแล้วจะไม่กลับคืน ต้องแนบใหม่หากต้องการใช้อีก
          </p>
        </section>
      )}
      <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        {initial
          ? `บันทึกและส่งคำขอ ${initial.requestNo} ใหม่ กลับไปตรวจสอบในขั้นตอนที่ ${initial.currentStep} โดยไม่ออกเลขคำขอใหม่`
          : "เมื่อส่งคำขอ ระบบจะออกเลขเอกสารอัตโนมัติ บันทึกข้อมูลตามแบบ ว119 และสร้างงานตรวจสอบให้เจ้าหน้าที่พัสดุ"}
      </div>
    </div>
  );
}
