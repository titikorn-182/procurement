import { AttachmentPicker } from "@/app/components/attachment-picker";
import { formatAttachmentSize } from "@/app/lib/request-attachments";
import { Pol01ChecklistFields } from "@/app/requests/components/pol01-checklist-fields";
import { TorFields } from "@/app/requests/tor/fields";
import { FileText } from "lucide-react";
import Link from "next/link";
import { EditSection } from "./frame";
import type { ReturnedRequestFormController } from "./use-returned-request-form";
type Props = Pick<
  ReturnedRequestFormController,
  | "documentChecklist"
  | "checklistContext"
  | "setDocumentChecklist"
  | "isPending"
  | "initial"
  | "torDocuments"
  | "setTorDocuments"
  | "title"
  | "rationale"
  | "newAttachments"
  | "setNewAttachments"
>;
export function AttachmentsSection({
  documentChecklist,
  checklistContext,
  setDocumentChecklist,
  isPending,
  initial,
  torDocuments,
  setTorDocuments,
  title,
  rationale,
  newAttachments,
  setNewAttachments,
}: Props) {
  return (
    <EditSection
      title="เอกสารแนบ"
      description="เอกสารเดิมจะคงอยู่ สามารถแนบเอกสารเพิ่มเติมตามข้อสังเกตของผู้ตรวจสอบได้"
    >
      <div className="mb-6">
        <Pol01ChecklistFields
          value={documentChecklist}
          context={checklistContext}
          onChange={setDocumentChecklist}
          disabled={isPending}
        />
      </div>
      {initial.attachments.length > 0 && (
        <ul
          aria-label="เอกสารแนบเดิม"
          className="mb-5 divide-y divide-[var(--line)] border border-[var(--line)]"
        >
          {initial.attachments.map((attachment) => (
            <li key={attachment.id} className="flex min-w-0 items-center gap-3 p-3">
              <FileText className="shrink-0 text-[var(--orange)]" size={20} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{attachment.fileName}</p>
                <p className="text-xs text-stone-500">
                  {formatAttachmentSize(attachment.sizeBytes)} · เอกสารเดิม
                </p>
              </div>
              <Link
                className="min-h-10 px-3 py-2 text-sm font-semibold text-[var(--blue)] hover:underline"
                href={`/api/request-attachments/${attachment.id}`}
              >
                ดาวน์โหลด
              </Link>
            </li>
          ))}
        </ul>
      )}
      <TorFields
        value={torDocuments}
        onChange={setTorDocuments}
        categories={documentChecklist.categories}
        subject={title}
        background={rationale}
        disabled={isPending}
      />
      <AttachmentPicker files={newAttachments} onChange={setNewAttachments} disabled={isPending} />
    </EditSection>
  );
}
