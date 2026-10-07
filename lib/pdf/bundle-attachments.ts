import {
  maxAttachmentCount,
  maxAttachmentSizeBytes,
  maxTotalAttachmentSizeBytes,
  resolveAttachmentMimeType,
} from "@/app/lib/request-attachments";

export type PdfBundleAttachment = {
  id: string;
  name: string;
  mimeType: string;
  sizeBytes: number;
};

export class PdfBundleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PdfBundleError";
  }
}

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const supportedMimeTypes = new Set(["application/pdf", "image/jpeg", "image/png"]);
export const maxBundlePages = 250;

export function validateBundleAttachments(attachments: readonly PdfBundleAttachment[]): void {
  if (attachments.length > maxAttachmentCount) {
    throw new PdfBundleError(`รวมเอกสารแนบได้ไม่เกิน ${maxAttachmentCount} ไฟล์ต่อคำขอ`);
  }
  const ids = new Set<string>();
  for (const attachment of attachments) {
    if (!uuidPattern.test(attachment.id) || ids.has(attachment.id)) {
      throw new PdfBundleError("ข้อมูลเอกสารแนบไม่ถูกต้อง กรุณาโหลดหน้าคำขอใหม่");
    }
    ids.add(attachment.id);
    const mimeType = resolveAttachmentMimeType({
      name: attachment.name,
      type: attachment.mimeType,
      size: attachment.sizeBytes,
    });
    if (!mimeType || !supportedMimeTypes.has(mimeType)) {
      throw new PdfBundleError(
        `รวมไฟล์ “${attachment.name}” ไม่ได้ รองรับ PDF, JPG และ PNG เท่านั้น กรุณาแปลง Word/Excel เป็น PDF แล้วแนบใหม่ หรือดาวน์โหลดเฉพาะแบบฟอร์ม`,
      );
    }
    if (
      !Number.isSafeInteger(attachment.sizeBytes) ||
      attachment.sizeBytes <= 0 ||
      attachment.sizeBytes > maxAttachmentSizeBytes
    ) {
      throw new PdfBundleError(`ไฟล์ “${attachment.name}” ต้องมีข้อมูลและมีขนาดไม่เกิน 20 MB`);
    }
  }
  if (
    attachments.reduce((total, attachment) => total + attachment.sizeBytes, 0) >
    maxTotalAttachmentSizeBytes
  ) {
    throw new PdfBundleError("ไฟล์แนบทั้งหมดมีขนาดเกิน 50 MB กรุณาลดขนาดไฟล์ก่อนรวม PDF");
  }
}
