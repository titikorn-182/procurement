import { EncryptedPDFError, PDFDocument, PageSizes } from "pdf-lib";
import { prepareStaticSignatureCopy } from "./static-signature-copy";
import { maxAttachmentSizeBytes, maxTotalAttachmentSizeBytes } from "@/app/lib/request-attachments";
import {
  maxBundlePages,
  PdfBundleError,
  validateBundleAttachments,
  type PdfBundleAttachment,
} from "./bundle-attachments";

type AttachmentLoader = (attachment: PdfBundleAttachment) => Promise<Uint8Array>;
const imageMarginPoints = 28.35; // 10 mm on each side of an A4 page.
// pdf-lib's ES5 build does not preserve the Error subclass prototype.
const encryptedPdfMessage = new EncryptedPDFError().message;

function checkPageLimit(count: number) {
  if (count > maxBundlePages) {
    throw new PdfBundleError(
      `เอกสารรวมมีจำนวนเกิน ${maxBundlePages} หน้า กรุณาลดจำนวนหน้าเอกสารแนบ`,
    );
  }
}

async function appendPdf(
  output: PDFDocument,
  bytes: Uint8Array,
  name: string,
  onProgress?: (message: string) => void,
) {
  const input = await PDFDocument.load(bytes, {
    updateMetadata: false,
    throwOnInvalidObject: true,
  });
  if (!input.getPageCount()) throw new Error("empty attachment PDF");
  checkPageLimit(output.getPageCount() + input.getPageCount());
  if (prepareStaticSignatureCopy(input, name)) {
    onProgress?.(`กำลังรวมสำเนา “${name}” โดยเก็บต้นฉบับไว้ตรวจสอบลายเซ็นดิจิทัล`);
  }
  const pages = await output.copyPages(input, input.getPageIndices());
  pages.forEach((page) => output.addPage(page));
}

/** Retain original PDF page sizes/order; fit image attachments on A4 without cropping. */
export async function mergePdfAttachments(
  formBytes: Uint8Array,
  attachments: readonly PdfBundleAttachment[],
  loadAttachment: AttachmentLoader,
  onProgress?: (message: string) => void,
): Promise<Uint8Array> {
  validateBundleAttachments(attachments);
  const output = await PDFDocument.load(formBytes, { updateMetadata: false });
  output.setTitle(`สำเนารวมเอกสารแนบ - ${output.getTitle() ?? "คำขอจัดซื้อจัดจ้าง"}`);
  output.setSubject(
    "สำเนาสำหรับอ่านและพิมพ์ ไม่ใช้ตรวจสอบลายเซ็นดิจิทัล ให้ตรวจสอบจากไฟล์ต้นฉบับที่แนบในระบบ",
  );
  checkPageLimit(output.getPageCount());
  let totalBytes = 0;
  for (const [index, attachment] of attachments.entries()) {
    onProgress?.(`กำลังรวมเอกสารแนบ ${index + 1}/${attachments.length}: ${attachment.name}`);
    try {
      const bytes = await loadAttachment(attachment);
      totalBytes += bytes.byteLength;
      if (
        !bytes.byteLength ||
        bytes.byteLength > maxAttachmentSizeBytes ||
        totalBytes > maxTotalAttachmentSizeBytes
      ) {
        throw new PdfBundleError(
          `ไฟล์ “${attachment.name}” ไม่มีข้อมูลหรือมีขนาดเกินขีดจำกัด กรุณาตรวจสอบไฟล์แนบ`,
        );
      }
      if (
        attachment.mimeType === "application/pdf" ||
        attachment.name.toLowerCase().endsWith(".pdf")
      ) {
        await appendPdf(output, bytes, attachment.name, onProgress);
      } else {
        checkPageLimit(output.getPageCount() + 1);
        // The browser loader normalizes photo orientation before embedding.
        // Direct JPEG input is also supported for non-browser callers.
        const isPng = bytes[0] === 0x89 && bytes[1] === 0x50;
        const image = isPng ? await output.embedPng(bytes) : await output.embedJpg(bytes);
        const landscape = image.width > image.height;
        const [width, height] = landscape ? [PageSizes.A4[1], PageSizes.A4[0]] : PageSizes.A4;
        const page = output.addPage([width, height]);
        const scaled = image.scaleToFit(
          width - imageMarginPoints * 2,
          height - imageMarginPoints * 2,
        );
        page.drawImage(image, {
          x: (width - scaled.width) / 2,
          y: (height - scaled.height) / 2,
          ...scaled,
        });
      }
    } catch (error) {
      if (error instanceof PdfBundleError) throw error;
      if (error instanceof Error && error.message === encryptedPdfMessage) {
        throw new PdfBundleError(
          `ไฟล์ “${attachment.name}” ถูกเข้ารหัสหรือมีรหัสผ่าน กรุณาแนบสำเนา PDF ที่เปิดได้ตามปกติ`,
        );
      }
      throw new PdfBundleError(
        `อ่านหรือรวมไฟล์ “${attachment.name}” ไม่สำเร็จ กรุณาตรวจว่าไฟล์เปิดได้ตามปกติ แล้วลองใหม่`,
      );
    }
  }
  onProgress?.("กำลังบันทึก PDF รวมเอกสารแนบ...");
  return output.save();
}
