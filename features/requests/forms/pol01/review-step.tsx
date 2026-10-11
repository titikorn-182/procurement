import { Pol01ChecklistSummary } from "@/app/requests/components/pol01-checklist-summary";
import { money } from "./constants";
import type { Pol01FormController } from "./use-pol01-form";
type Props = Pick<
  Pol01FormController,
  | "requestType"
  | "title"
  | "rationale"
  | "requiredDate"
  | "items"
  | "selectedLoanLabel"
  | "selectedVendorName"
  | "fundSource"
  | "sourceCode"
  | "departmentCode"
  | "fundCode"
  | "activityCode"
  | "approvalDetails"
  | "total"
  | "attachments"
  | "documentChecklist"
  | "checklistContext"
  | "torDocuments"
  | "vendorSelection"
>;
export function ReviewStep({
  requestType,
  title,
  rationale,
  requiredDate,
  items,
  selectedLoanLabel,
  selectedVendorName,
  fundSource,
  sourceCode,
  departmentCode,
  fundCode,
  activityCode,
  approvalDetails,
  total,
  attachments,
  documentChecklist,
  checklistContext,
  torDocuments,
  vendorSelection,
}: Props) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-xs font-bold uppercase tracking-wider text-orange-600">
          {requestType === "purchase" ? "คำขอจัดซื้อ" : "คำขอจัดจ้าง"}
        </p>
        <h3 className="mt-2 text-lg font-bold text-slate-900">{title}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{rationale}</p>
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
          <dt className="text-sm text-slate-500">ความต้องการยืมเงิน</dt>
          <dd className="mt-1 font-semibold leading-6 text-slate-900">{selectedLoanLabel}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">ผู้ประกอบการ/ร้านค้า</dt>
          <dd className="mt-1 font-semibold text-slate-900">{selectedVendorName}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">แหล่งเงินทุน</dt>
          <dd className="mt-1 font-semibold text-slate-900">{fundSource}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">รหัสแหล่งเงิน</dt>
          <dd className="mt-1 font-semibold text-slate-900">{sourceCode}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">รหัสหน่วยงาน</dt>
          <dd className="mt-1 font-semibold text-slate-900">{departmentCode}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">รหัสกองทุน</dt>
          <dd className="mt-1 font-semibold text-slate-900">{fundCode}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">รหัสกิจกรรม</dt>
          <dd className="mt-1 font-semibold text-slate-900">{activityCode}</dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-sm text-slate-500">ผู้ลงนาม</dt>
          <dd className="mt-1 font-semibold leading-6 text-slate-900">
            ผู้ขอ {approvalDetails.requester.name} · ผู้เห็นชอบ {approvalDetails.endorser.name} ·
            ผู้อนุมัติ {approvalDetails.approver.name}
          </dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">ยอดรวม</dt>
          <dd className="mt-1 text-xl font-bold text-orange-700">{money(total)}</dd>
        </div>
        <div>
          <dt className="text-sm text-slate-500">เอกสารแนบ</dt>
          <dd className="mt-1 font-semibold text-slate-900">{attachments.length} ไฟล์</dd>
        </div>
      </dl>
      <Pol01ChecklistSummary value={documentChecklist} context={checklistContext} />
      {torDocuments.length > 0 && (
        <p className="mt-4 text-sm">
          สร้าง PDF TOR แนบคำขอ {torDocuments.length} ฉบับ แยกตามประเภทพัสดุ
          จากข้อมูลล่าสุดเมื่อส่งคำขอ
        </p>
      )}
      {vendorSelection.kind === "new" && (
        <div className="border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
          โปรดตรวจสอบว่าได้แนบเอกสารผู้ประกอบการ/ผู้รับจ้างรายใหม่แล้ว
        </div>
      )}
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
        เมื่อส่งคำขอ ระบบจะออกเลขเอกสารอัตโนมัติและสร้างงานตรวจสอบให้เจ้าหน้าที่พัสดุ
      </div>
    </div>
  );
}
