import { Paperclip } from "lucide-react";
import { AttachmentPicker } from "../../components/attachment-picker";
import { pol02DocumentChecklist } from "./pol02";
import type { PaymentFormFiles } from "./types";

type Props = {
  selectedDocuments: string[];
  files: PaymentFormFiles;
  disabled: boolean;
  onSelectedDocumentsChange: (documents: string[]) => void;
  onFilesChange: (files: PaymentFormFiles[number][]) => void;
};

export function PaymentDocumentsSection({
  selectedDocuments,
  files,
  disabled,
  onSelectedDocumentsChange,
  onFilesChange,
}: Props) {
  function toggleDocument(documentId: string) {
    onSelectedDocumentsChange(
      selectedDocuments.includes(documentId)
        ? selectedDocuments.filter((id) => id !== documentId)
        : [...selectedDocuments, documentId],
    );
  }

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
        <fieldset className="border border-[var(--line)] bg-white">
          <legend className="mx-3 px-1 text-sm font-bold">รายการตรวจสอบเอกสาร</legend>
          <div className="grid divide-y divide-[var(--line)] md:grid-cols-2 md:divide-y-0">
            {pol02DocumentChecklist.map((document, index) => (
              <label
                key={document.id}
                className={`flex min-h-16 cursor-pointer items-start gap-3 p-4 hover:bg-[var(--paper-warm)] ${
                  index % 2 === 0 ? "md:border-r md:border-[var(--line)]" : ""
                } ${index >= 2 ? "md:border-t md:border-[var(--line)]" : ""}`}
              >
                <input
                  type="checkbox"
                  checked={selectedDocuments.includes(document.id)}
                  disabled={disabled}
                  onChange={() => toggleDocument(document.id)}
                  className="mt-1 size-4 accent-[var(--orange)]"
                />
                <span className="text-sm leading-6">{document.label}</span>
              </label>
            ))}
          </div>
        </fieldset>
        <AttachmentPicker files={files} onChange={onFilesChange} disabled={disabled} />
      </div>
    </section>
  );
}
