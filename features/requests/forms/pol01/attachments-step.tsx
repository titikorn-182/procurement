import { AttachmentPicker } from "@/app/components/attachment-picker";
import { Pol01ChecklistFields } from "@/app/requests/components/pol01-checklist-fields";
import { TorFields } from "@/app/requests/tor/fields";
import { AlertCircle } from "lucide-react";
import type { Pol01FormController } from "./use-pol01-form";
type Props = Pick<
  Pol01FormController,
  | "documentChecklist"
  | "checklistContext"
  | "setDocumentChecklist"
  | "isPending"
  | "draft"
  | "vendorSelection"
  | "torDocuments"
  | "setTorDocuments"
  | "title"
  | "rationale"
  | "attachments"
  | "setAttachments"
>;
export function AttachmentsStep({
  documentChecklist,
  checklistContext,
  setDocumentChecklist,
  isPending,
  draft,
  vendorSelection,
  torDocuments,
  setTorDocuments,
  title,
  rationale,
  attachments,
  setAttachments,
}: Props) {
  return (
    <div className="space-y-4">
      <Pol01ChecklistFields
        value={documentChecklist}
        context={checklistContext}
        onChange={setDocumentChecklist}
        disabled={isPending || Boolean(draft)}
      />
      {vendorSelection.kind === "new" && (
        <section
          role="status"
          className="border border-amber-300 bg-amber-50 p-4 text-amber-950"
          aria-labelledby="required-attachments-heading"
        >
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 shrink-0 text-amber-700" size={19} aria-hidden="true" />
            <div>
              <h3 id="required-attachments-heading" className="font-bold">
                เอกสารที่ต้องแนบตามข้อมูลที่เลือก
              </h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                <li>เอกสารของผู้ประกอบการ/ผู้รับจ้างรายใหม่ เพื่อให้เจ้าหน้าที่พัสดุตรวจสอบ</li>
              </ul>
            </div>
          </div>
        </section>
      )}
      <TorFields
        value={torDocuments}
        onChange={setTorDocuments}
        categories={documentChecklist.categories}
        subject={title}
        background={rationale}
        disabled={isPending || Boolean(draft)}
      />
      <h3 className="mb-3 font-bold">เอกสารแนบอื่น</h3>
      <AttachmentPicker files={attachments} onChange={setAttachments} disabled={isPending} />
      <p className="text-sm leading-6 text-[var(--ink)]">
        ต้องการดาวน์โหลด POL-01 พร้อมเอกสารแนบเป็น PDF ไฟล์เดียว ให้แนบไฟล์ PDF, JPG หรือ PNG
        หลังส่งคำขอแล้ว เปิดหน้าพิมพ์และเลือก “ดาวน์โหลด PDF รวมเอกสารแนบ” หากเป็น Word/Excel
        กรุณาแปลงเป็น PDF ก่อนแนบ
      </p>
    </div>
  );
}
