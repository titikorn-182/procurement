import { maxAttachmentSizeBytes, maxTotalAttachmentSizeBytes } from "@/app/lib/request-attachments";
import {
  PdfBundleError,
  validateBundleAttachments,
  type PdfBundleAttachment,
} from "./bundle-attachments";
import { createPaginatedDocumentPdf } from "./download-document";
import { mergePdfAttachments } from "./merge-attachments";

const attachmentTimeoutMs = 60_000;
const maxImagePixels = 48_000_000;
const maxImageSidePixels = 3508; // Approximately 300 dpi on the long side of A4.

async function readLimitedResponse(response: Response, name: string): Promise<Uint8Array> {
  if (Number(response.headers.get("content-length")) > maxAttachmentSizeBytes) {
    throw new PdfBundleError(`ไฟล์ “${name}” มีขนาดเกิน 20 MB`);
  }
  const reader = response.body?.getReader();
  if (!reader) throw new PdfBundleError(`ดาวน์โหลดไฟล์ “${name}” ไม่สำเร็จ กรุณาลองใหม่`);
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maxAttachmentSizeBytes) {
        await reader.cancel();
        throw new PdfBundleError(`ไฟล์ “${name}” มีขนาดเกิน 20 MB`);
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

async function normalizeImage(
  bytes: Uint8Array,
  attachment: PdfBundleAttachment,
): Promise<Uint8Array> {
  const bitmap = await createImageBitmap(new Blob([new Uint8Array(bytes)]), {
    imageOrientation: "from-image",
  });
  try {
    if (bitmap.width * bitmap.height > maxImagePixels) {
      throw new PdfBundleError(
        `ภาพ “${attachment.name}” มีความละเอียดสูงเกินไป กรุณาลดขนาดภาพก่อนรวม PDF`,
      );
    }
    const ratio = Math.min(1, maxImageSidePixels / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
    canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("image canvas unavailable");
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const mime =
      attachment.mimeType === "image/png" || /\.png$/i.test(attachment.name)
        ? "image/png"
        : "image/jpeg";
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("image conversion failed"))),
        mime,
        0.95,
      );
    });
    canvas.width = canvas.height = 0;
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    bitmap.close();
  }
}

/** Downloads through the existing authenticated/RLS-protected attachment endpoint. */
export async function fetchRequestBundleAttachment(
  attachment: PdfBundleAttachment,
): Promise<Uint8Array> {
  validateBundleAttachments([attachment]);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), attachmentTimeoutMs);
  try {
    const response = await fetch(`/api/request-attachments/${attachment.id}`, {
      credentials: "same-origin",
      cache: "no-store",
      signal: controller.signal,
    });
    if (response.status === 401)
      throw new PdfBundleError("กรุณาเข้าสู่ระบบใหม่ก่อนดาวน์โหลดเอกสารแนบ");
    if (response.status === 403 || response.status === 404) {
      throw new PdfBundleError(
        `ไม่พบไฟล์ “${attachment.name}” หรือคุณไม่มีสิทธิ์เข้าถึง กรุณาติดต่อเจ้าหน้าที่`,
      );
    }
    if (!response.ok) throw new Error("attachment request failed");
    return await readLimitedResponse(response, attachment.name);
  } catch (error) {
    if (error instanceof PdfBundleError) throw error;
    throw new PdfBundleError(
      `ดาวน์โหลดไฟล์ “${attachment.name}” ไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตและสิทธิ์เข้าถึง แล้วลองใหม่`,
    );
  } finally {
    clearTimeout(timeout);
  }
}

/** Local selections stay on the device; saved attachments retain per-file access checks. */
export async function loadRequestBundleAttachment(
  attachment: PdfBundleAttachment,
): Promise<Uint8Array> {
  if (!attachment.file) return fetchRequestBundleAttachment(attachment);
  validateBundleAttachments([attachment]);
  try {
    return new Uint8Array(await attachment.file.arrayBuffer());
  } catch {
    throw new PdfBundleError(`อ่านไฟล์ “${attachment.name}” ไม่สำเร็จ กรุณาเลือกไฟล์แนบใหม่`);
  }
}

export async function downloadRequestBundle(
  documentElement: HTMLElement,
  fileName: string,
  attachments: readonly PdfBundleAttachment[],
  onProgress: (message: string) => void,
) {
  validateBundleAttachments(attachments);
  onProgress("กำลังสร้างแบบฟอร์ม...");
  const form = await createPaginatedDocumentPdf(documentElement, fileName);
  let downloadedBytes = 0;
  const bytes = await mergePdfAttachments(
    new Uint8Array(form.output("arraybuffer")),
    attachments,
    async (attachment) => {
      const content = await loadRequestBundleAttachment(attachment);
      downloadedBytes += content.byteLength;
      if (downloadedBytes > maxTotalAttachmentSizeBytes) {
        throw new PdfBundleError("ไฟล์แนบทั้งหมดมีขนาดเกิน 50 MB กรุณาลดขนาดไฟล์ก่อนรวม PDF");
      }
      return attachment.mimeType.startsWith("image/") || /\.(png|jpe?g)$/i.test(attachment.name)
        ? normalizeImage(content, attachment)
        : content;
    },
    onProgress,
  );
  // Do not download anything until every attachment has been read and merged.
  const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: "application/pdf" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName.replace(/\.pdf$/i, "") + "-พร้อมเอกสารแนบ.pdf";
  document.body.append(link);
  try {
    link.click();
  } finally {
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
}
