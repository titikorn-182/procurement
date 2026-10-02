export const attachmentBucket = "procurement-documents";
export const maxAttachmentCount = 10;
export const maxAttachmentSizeBytes = 20 * 1024 * 1024;
export const maxTotalAttachmentSizeBytes = 50 * 1024 * 1024;

const mimeTypesByExtension = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
} as const;

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const acceptedAttachmentTypes = Object.values(mimeTypesByExtension).join(",");

export type AttachmentCandidate = {
  name: string;
  size: number;
  type: string;
};

export type SelectedAttachment = {
  id: string;
  file: File;
};

function extensionOf(fileName: string) {
  const extension = fileName.split(".").pop()?.toLowerCase() ?? "";
  return Object.prototype.hasOwnProperty.call(mimeTypesByExtension, extension) ? extension : null;
}

export function resolveAttachmentMimeType(file: AttachmentCandidate) {
  const extension = extensionOf(file.name);
  if (!extension) return null;
  const expected = mimeTypesByExtension[extension as keyof typeof mimeTypesByExtension];
  return !file.type || file.type === expected ? expected : null;
}

export function validateAttachmentCandidates(files: readonly AttachmentCandidate[]) {
  if (files.length > maxAttachmentCount) {
    return `แนบไฟล์ได้ไม่เกิน ${maxAttachmentCount} ไฟล์ต่อคำขอ`;
  }

  const invalidName = files.find(
    (file) =>
      !file.name.trim() || file.name.length > 255 || /[\u0000-\u001f\u007f]/.test(file.name),
  );
  if (invalidName) {
    return "ชื่อไฟล์ต้องมีความยาวไม่เกิน 255 ตัวอักษรและไม่มีอักขระควบคุม";
  }

  const emptyFile = files.find((file) => file.size === 0);
  if (emptyFile) {
    return `ไฟล์ “${emptyFile.name}” ไม่มีข้อมูล กรุณาเลือกไฟล์ใหม่`;
  }

  const invalidType = files.find((file) => !resolveAttachmentMimeType(file));
  if (invalidType) {
    return `ไฟล์ “${invalidType.name}” ไม่รองรับ กรุณาใช้ PDF, JPG, PNG, DOCX หรือ XLSX`;
  }

  const oversized = files.find((file) => file.size > maxAttachmentSizeBytes);
  if (oversized) {
    return `ไฟล์ “${oversized.name}” มีขนาดเกิน 20 MB`;
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > maxTotalAttachmentSizeBytes) {
    return "ไฟล์แนบทั้งหมดมีขนาดเกิน 50 MB";
  }

  return null;
}

export function requestAttachmentPath(requestId: string, selection: SelectedAttachment) {
  return attachmentPath("requests", requestId, selection);
}

export function paymentAttachmentPath(paymentId: string, selection: SelectedAttachment) {
  return attachmentPath("payments", paymentId, selection);
}

function attachmentPath(
  prefix: "requests" | "payments",
  entityId: string,
  selection: SelectedAttachment,
) {
  const extension = extensionOf(selection.file.name);
  if (!extension || !uuidPattern.test(entityId) || !uuidPattern.test(selection.id)) {
    throw new Error("invalid attachment path");
  }
  return `${prefix}/${entityId}/${selection.id}.${extension}`;
}

export function formatAttachmentSize(size: number) {
  if (size < 1024 * 1024) return `${Math.max(1, Math.ceil(size / 1024))} KB`;
  return `${(size / (1024 * 1024)).toLocaleString("th-TH", { maximumFractionDigits: 1 })} MB`;
}
