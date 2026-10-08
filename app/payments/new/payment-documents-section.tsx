import { Paperclip } from "lucide-react";
import { AttachmentPicker } from "../../components/attachment-picker";
import { Pol02ChecklistFields } from "./pol02-checklist-fields";
import type { Pol02Checklist } from "./pol02-checklist";
import type { PaymentFormFiles } from "./types";

type Props = {
  checklist: Pol02Checklist;
  files: PaymentFormFiles;
  disabled: boolean;
  onChecklistChange: (checklist: Pol02Checklist) => void;
  onFilesChange: (files: PaymentFormFiles[number][]) => void;
};

export function PaymentDocumentsSection({
  checklist,
  files,
  disabled,
  onChecklistChange,
  onFilesChange,
}: Props) {
  return (
    <section aria-labelledby="payment-documents-heading">
      <div className="flex items-start gap-3 bg-[var(--paper-warm)] px-5 py-4">
        <Paperclip className="mt-0.5 text-[var(--orange)]" size={22} aria-hidden="true" />
        <div>
          <h2 id="payment-documents-heading" className="text-lg font-bold">
            5. เอกสารประกอบคำขอเบิกจ่าย
          </h2>
          <p className="mt-0.5 text-sm text-stone-600">
            ทำเครื่องหมายเฉพาะเอกสารที่แนบจริง และอัปโหลดอย่างน้อย 1 ไฟล์ก่อนส่งคำขอ
          </p>
        </div>
      </div>
      <div className="space-y-5 p-5">
        <Pol02ChecklistFields value={checklist} onChange={onChecklistChange} disabled={disabled} />
        <AttachmentPicker files={files} onChange={onFilesChange} disabled={disabled} />
      </div>
    </section>
  );
}
