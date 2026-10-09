import { afterEach, describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { downloadRequestBundle } from "../../lib/pdf/download-request-bundle";
import { createSignaturePdf } from "../fixtures/signature-pdf";

vi.mock("../../lib/pdf/download-document", () => ({
  createPaginatedDocumentPdf: async () => {
    const pdf = await PDFDocument.create();
    pdf.addPage();
    const bytes = await pdf.save();
    return { output: () => bytes };
  },
}));

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("signed attachment download", () => {
  it("downloads a labeled static copy locally, with no write-back or upload", async () => {
    vi.useFakeTimers();
    const { pdf } = await createSignaturePdf();
    const bytes = await pdf.save();
    const original = bytes.slice();
    const file = new File([new Uint8Array(bytes)], "signed.pdf", { type: "application/pdf" });
    const link = { href: "", download: "", click: vi.fn(), remove: vi.fn() };
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    vi.stubGlobal("document", { createElement: () => link, body: { append: vi.fn() } });
    const createUrl = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:static-copy");
    const revokeUrl = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => undefined);
    await downloadRequestBundle(
      {} as HTMLElement,
      "W119.pdf",
      [
        {
          id: "11111111-1111-4111-8111-111111111111",
          name: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          file,
        },
      ],
      vi.fn(),
    );
    expect(link.download).toBe("W119-สำเนารวมเอกสารแนบ.pdf");
    expect(link.click).toHaveBeenCalledOnce();
    expect(link.remove).toHaveBeenCalledOnce();
    expect(fetch).not.toHaveBeenCalled();
    expect(bytes).toEqual(original);
    expect(new Uint8Array(await file.arrayBuffer())).toEqual(original);
    const blob = createUrl.mock.calls[0][0];
    if (!(blob instanceof Blob)) throw new Error("Expected a PDF Blob");
    const merged = await PDFDocument.load(await blob.arrayBuffer());
    expect(merged.getPageCount()).toBe(2);
    expect(merged.getSubject()).toContain("ไม่ใช้ตรวจสอบลายเซ็นดิจิทัล");
    await vi.runAllTimersAsync();
    expect(revokeUrl).toHaveBeenCalledWith("blob:static-copy");
  });

  it("never starts a download if a later signed attachment has an unsupported appearance", async () => {
    const { pdf } = await createSignaturePdf();
    pdf.getForm().createTextField("invoice").setText("INV-001");
    const goodPdf = await PDFDocument.create();
    goodPdf.addPage();
    const files = [
      new File([new Uint8Array(await goodPdf.save())], "first.pdf", { type: "application/pdf" }),
      new File([new Uint8Array(await pdf.save())], "second.pdf", { type: "application/pdf" }),
    ];
    const createUrl = vi.spyOn(URL, "createObjectURL");
    await expect(
      downloadRequestBundle(
        {} as HTMLElement,
        "POL01.pdf",
        files.map((file, index) => ({
          id: `${index + 1}1111111-1111-4111-8111-111111111111`,
          name: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          file,
        })),
        vi.fn(),
      ),
    ).rejects.toThrow("second.pdf");
    expect(createUrl).not.toHaveBeenCalled();
  });
});
