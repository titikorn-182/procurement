import { PDFDocument, PDFName, degrees } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import {
  maxAttachmentSizeBytes,
  maxTotalAttachmentSizeBytes,
} from "../../app/lib/request-attachments";
import {
  PdfBundleError,
  maxBundlePages,
  validateBundleAttachments,
  type PdfBundleAttachment,
} from "../../lib/pdf/bundle-attachments";
import { mergePdfAttachments } from "../../lib/pdf/merge-attachments";

const attachment = (patch: Partial<PdfBundleAttachment> = {}): PdfBundleAttachment => ({
  id: "11111111-1111-4111-8111-111111111111",
  name: "ใบเสนอราคา.pdf",
  mimeType: "application/pdf",
  sizeBytes: 500,
  ...patch,
});

async function pdfBytes(widths = [300]) {
  const pdf = await PDFDocument.create();
  widths.forEach((width) => pdf.addPage([width, 400]));
  return pdf.save();
}

describe("POL-01 attachment bundle", () => {
  it("puts every original PDF page after the form in attachment order", async () => {
    const form = await pdfBytes([100]);
    const first = await pdfBytes([200, 250]);
    const secondPdf = await PDFDocument.create();
    secondPdf.addPage([400, 300]).setRotation(degrees(90));
    const second = await secondPdf.save();
    const originalFirst = first.slice();
    const attachments = [
      attachment(),
      attachment({ id: "22222222-2222-4222-8222-222222222222", name: "สัญญา.pdf" }),
    ];
    const loader = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second);
    const progress = vi.fn();
    const result = await mergePdfAttachments(form, attachments, loader, progress);
    const merged = await PDFDocument.load(result);

    expect(merged.getPages().map((page) => page.getWidth())).toEqual([100, 200, 250, 400]);
    expect(merged.getPage(3).getRotation().angle).toBe(90);
    expect(loader.mock.calls.map(([item]) => item.name)).toEqual(["ใบเสนอราคา.pdf", "สัญญา.pdf"]);
    expect(progress).toHaveBeenCalledWith(expect.stringContaining("1/2: ใบเสนอราคา.pdf"));
    expect(first).toEqual(originalFirst);
  });

  it("fits a PNG attachment on an A4 page", async () => {
    const png = new Uint8Array(
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a8o0AAAAASUVORK5CYII=",
        "base64",
      ),
    );
    const result = await mergePdfAttachments(
      await pdfBytes(),
      [attachment({ name: "รูปภาพ.png", mimeType: "image/png", sizeBytes: png.length })],
      async () => png,
    );
    const merged = await PDFDocument.load(result);
    expect(merged.getPageCount()).toBe(2);
    expect(merged.getPage(1).getWidth()).toBeCloseTo(595.28);
    expect(merged.getPage(1).getHeight()).toBeCloseTo(841.89);
  });

  it("keeps form-only downloads valid when there are no attachments", async () => {
    const loader = vi.fn();
    const result = await mergePdfAttachments(await pdfBytes([100, 200]), [], loader);
    expect((await PDFDocument.load(result)).getPageCount()).toBe(2);
    expect(loader).not.toHaveBeenCalled();
  });

  it("fails before fetching any file if the bundle contains Word or Excel", async () => {
    const loader = vi.fn();
    await expect(
      mergePdfAttachments(
        await pdfBytes(),
        [
          attachment({
            name: "รายละเอียด.docx",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          }),
        ],
        loader,
      ),
    ).rejects.toThrow("รายละเอียด.docx");
    expect(loader).not.toHaveBeenCalled();
  });

  it("never returns a partial bundle when a later attachment cannot be read", async () => {
    const attachments = [
      attachment(),
      attachment({ id: "22222222-2222-4222-8222-222222222222", name: "อ่านไม่ได้.pdf" }),
    ];
    const loader = vi
      .fn()
      .mockResolvedValueOnce(await pdfBytes())
      .mockResolvedValueOnce(new Uint8Array([1, 2, 3]));
    await expect(mergePdfAttachments(await pdfBytes(), attachments, loader)).rejects.toThrow(
      "อ่านไม่ได้.pdf",
    );
  });

  it("preserves access errors without leaking raw fetch errors", async () => {
    await expect(
      mergePdfAttachments(await pdfBytes(), [attachment()], async () => {
        throw new PdfBundleError("กรุณาเข้าสู่ระบบใหม่");
      }),
    ).rejects.toThrow("กรุณาเข้าสู่ระบบใหม่");
    await expect(
      mergePdfAttachments(await pdfBytes(), [attachment()], async () => {
        throw new Error("private storage URL");
      }),
    ).rejects.toThrow("อ่านหรือรวมไฟล์ “ใบเสนอราคา.pdf” ไม่สำเร็จ");
  });

  it("rejects interactive forms without silently losing field values", async () => {
    const pdf = await PDFDocument.create();
    const page = pdf.addPage();
    const field = pdf.getForm().createTextField("invoiceNumber");
    field.setText("INV-001");
    field.addToPage(page);
    const original = await pdf.save();
    await expect(
      mergePdfAttachments(await pdfBytes(), [attachment()], async () => original),
    ).rejects.toThrow("ช่องกรอกข้อมูลที่ยังรวมอัตโนมัติไม่ได้");
    expect(
      (await PDFDocument.load(original)).getForm().getTextField("invoiceNumber").getText(),
    ).toBe("INV-001");
  });

  it("makes a static copy of PDFs marked as digitally certified", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    pdf.catalog.set(PDFName.of("Perms"), pdf.context.obj({}));
    const bytes = await pdf.save();
    const result = await mergePdfAttachments(await pdfBytes(), [attachment()], async () => bytes);
    const merged = await PDFDocument.load(result);
    expect(merged.getPageCount()).toBe(2);
    expect(merged.catalog.has(PDFName.of("Perms"))).toBe(false);
    expect(merged.getSubject()).toContain("ไม่ใช้ตรวจสอบลายเซ็นดิจิทัล");
    expect((await PDFDocument.load(bytes)).catalog.has(PDFName.of("Perms"))).toBe(true);
  });

  it("honors encryption rather than ignoring password protection", async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    pdf.context.trailerInfo.Encrypt = pdf.context.register(pdf.context.obj({ Filter: "Standard" }));
    const bytes = await pdf.save();
    await expect(
      mergePdfAttachments(await pdfBytes(), [attachment()], async () => bytes),
    ).rejects.toThrow("ถูกเข้ารหัสหรือมีรหัสผ่าน");
  });

  it("bounds the combined page count", async () => {
    const manyPages = await pdfBytes(Array.from({ length: maxBundlePages }, () => 300));
    await expect(
      mergePdfAttachments(await pdfBytes(), [attachment()], async () => manyPages),
    ).rejects.toThrow(`${maxBundlePages} หน้า`);
  });

  it("checks the actual byte count rather than trusting metadata", async () => {
    await expect(
      mergePdfAttachments(
        await pdfBytes(),
        [attachment()],
        async () => new Uint8Array(maxAttachmentSizeBytes + 1),
      ),
    ).rejects.toThrow("ขนาดเกินขีดจำกัด");
  });

  it.each([
    { id: "../other-file" },
    {
      name: "เอกสาร.xlsx",
      mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    },
    { name: "image.pdf", mimeType: "image/png" },
    { sizeBytes: 0 },
    { sizeBytes: Number.NaN },
    { sizeBytes: maxAttachmentSizeBytes + 1 },
  ])("rejects invalid attachment metadata: %j", (patch) => {
    expect(() => validateBundleAttachments([attachment(patch)])).toThrow(PdfBundleError);
  });

  it("rejects duplicate IDs and oversized totals", () => {
    expect(() => validateBundleAttachments([attachment(), attachment()])).toThrow(PdfBundleError);
    const attachments = Array.from({ length: 3 }, (_, index) =>
      attachment({
        id: `${index}1111111-1111-4111-8111-111111111111`,
        sizeBytes: Math.ceil(maxTotalAttachmentSizeBytes / 3) + 1,
      }),
    );
    expect(() => validateBundleAttachments(attachments)).toThrow("50 MB");
  });
});
