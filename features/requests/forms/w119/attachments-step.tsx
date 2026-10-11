import { AttachmentPicker } from "@/app/components/attachment-picker";
import { Button } from "@/app/components/ui";
import { formatAttachmentSize } from "@/app/lib/request-attachments";
import { LoanAgreementFields } from "@/app/requests/w119/loan-agreement-fields";
import { Printer, Trash2 } from "lucide-react";
import type { W119FormController } from "./use-w119-form";
type Props = Pick<
  W119FormController,
  | "advanceRequired"
  | "setAdvanceRequired"
  | "loanAgreement"
  | "setLoanAgreement"
  | "total"
  | "openPreview"
  | "isPending"
  | "existingAttachments"
  | "pendingRemovalIds"
  | "setPendingRemovalIds"
  | "retainedAttachments"
  | "pendingRemovalAttachments"
  | "attachments"
  | "setAttachments"
  | "initial"
>;
export function AttachmentsStep({
  advanceRequired,
  setAdvanceRequired,
  loanAgreement,
  setLoanAgreement,
  total,
  openPreview,
  isPending,
  existingAttachments,
  pendingRemovalIds,
  setPendingRemovalIds,
  retainedAttachments,
  pendingRemovalAttachments,
  attachments,
  setAttachments,
  initial,
}: Props) {
  return (
    <div className="space-y-6">
      <label className="flex cursor-pointer items-start gap-3 border border-slate-200 bg-slate-50 p-4">
        <input
          type="checkbox"
          checked={advanceRequired}
          onChange={(event) => setAdvanceRequired(event.target.checked)}
          className="mt-1 size-4 accent-orange-600"
        />
        <span>
          <span className="block font-semibold text-slate-900">ขออนุมัติยืมเงินทดรองราชการ</span>
          <span className="mt-1 block text-sm text-slate-500">
            เลือกเมื่อคำขอนี้ต้องดำเนินการยืมเงินตามส่วน (2) ของแบบฟอร์ม
          </span>
        </span>
      </label>
      {advanceRequired && (
        <LoanAgreementFields value={loanAgreement} onChange={setLoanAgreement} total={total} />
      )}
      {advanceRequired && (
        <Button variant="secondary" onClick={openPreview} disabled={isPending}>
          <Printer size={17} aria-hidden="true" /> ดู ว119 และสัญญายืมเงิน / PDF
        </Button>
      )}
      {existingAttachments.length > 0 && (
        <section aria-label="เอกสารแนบเดิม">
          <h3 className="font-bold">เอกสารแนบเดิม {existingAttachments.length} ไฟล์</h3>
          <ul className="mt-3 divide-y border border-[var(--line)]">
            {existingAttachments.map((attachment) => {
              const pendingRemoval = pendingRemovalIds.includes(attachment.id);
              return (
                <li
                  key={attachment.id}
                  className={`flex flex-wrap items-center justify-between gap-3 p-3 ${pendingRemoval ? "bg-[var(--red-soft)]" : ""}`}
                >
                  <span className="min-w-0 basis-full break-words [overflow-wrap:anywhere] sm:flex-1 sm:basis-auto">
                    {attachment.fileName} · {formatAttachmentSize(attachment.sizeBytes)}
                    {pendingRemoval && (
                      <span className="mt-1 block text-sm font-semibold text-[var(--red)]">
                        รอลบเมื่อบันทึก
                      </span>
                    )}
                  </span>
                  <div className="ml-auto flex flex-wrap items-center gap-2">
                    <a
                      href={`/api/request-attachments/${attachment.id}`}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 p-2 underline underline-offset-4"
                      aria-label={`เปิด ${attachment.fileName} ในแท็บใหม่`}
                    >
                      เปิดไฟล์เดิม
                    </a>
                    <button
                      type="button"
                      disabled={isPending}
                      aria-label={`${pendingRemoval ? "ยกเลิกการลบ" : "ลบเอกสารเดิม"} ${attachment.fileName}`}
                      onClick={() =>
                        setPendingRemovalIds((current) =>
                          pendingRemoval
                            ? current.filter((id) => id !== attachment.id)
                            : [...current, attachment.id],
                        )
                      }
                      className="inline-flex min-h-11 items-center gap-2 border border-[var(--red)] px-3 text-sm font-semibold text-[var(--red)] hover:bg-white disabled:opacity-45"
                    >
                      {!pendingRemoval && <Trash2 size={16} aria-hidden="true" />}
                      {pendingRemoval ? "ยกเลิกการลบ" : "ลบ"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="mt-2 text-sm">
            กด “ลบ” เพื่อเลือกไฟล์ที่จะนำออก ยังยกเลิกการลบได้ก่อนกด “บันทึกการแก้ไขและส่งใหม่”
            หากต้องการแทนที่ไฟล์ ให้แนบไฟล์ใหม่ด้านล่าง
          </p>
          <p role="status" className="mt-2 text-sm font-semibold">
            เก็บไฟล์เดิม {retainedAttachments.length} ไฟล์ · รอลบ {pendingRemovalAttachments.length}{" "}
            ไฟล์
          </p>
        </section>
      )}
      <AttachmentPicker files={attachments} onChange={setAttachments} disabled={isPending} />
      {initial && (
        <p className="text-sm">
          ตัวอย่างก่อนบันทึกจะแสดงข้อมูลที่แก้ไขและรวมได้เฉพาะไฟล์ที่แนบใหม่
          หลังส่งใหม่สามารถดาวน์โหลด PDF รวมเอกสารทั้งหมดจากหน้าคำขอได้
        </p>
      )}
      <p className="text-sm leading-6 text-[var(--ink)]">
        ต้องการรวมแบบ ว119 และเอกสารแนบเป็น PDF ไฟล์เดียว ให้แนบ PDF, JPG หรือ PNG แล้วกด
        “ดูตัวอย่าง / พิมพ์ / PDF” และเลือก “ดาวน์โหลด PDF รวมเอกสารแนบ” หากเป็น Word/Excel
        กรุณาแปลงเป็น PDF ก่อนแนบ การดาวน์โหลดฉบับร่างจะไม่ส่งคำขอ
      </p>
    </div>
  );
}
