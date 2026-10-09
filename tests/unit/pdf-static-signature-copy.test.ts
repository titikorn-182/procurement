import { PDFArray, PDFDict, PDFDocument, PDFName, PDFRawStream, decodePDFRawStream } from "pdf-lib";
import { describe, expect, it, vi } from "vitest";
import { prepareStaticSignatureCopy } from "../../lib/pdf/static-signature-copy";
import { mergePdfAttachments } from "../../lib/pdf/merge-attachments";
import { createSignaturePdf } from "../fixtures/signature-pdf";

const key = PDFName.of;
function rawStream(value: unknown): PDFRawStream {
  if (!(value instanceof PDFRawStream)) throw new Error("Expected a PDF stream");
  return value;
}
const attachment = {
  id: "11111111-1111-4111-8111-111111111111",
  name: "signed.pdf",
  mimeType: "application/pdf",
  sizeBytes: 500,
};

async function bundle(bytes: Uint8Array, progress = vi.fn()) {
  const form = await PDFDocument.create();
  form.addPage([200, 200]);
  return PDFDocument.load(
    await mergePdfAttachments(await form.save(), [attachment], async () => bytes, progress),
  );
}

describe("static signature copies", () => {
  it.each([
    {},
    { appearance: false },
    { inherited: true },
    { orphan: true },
    { rotation: 90, matrix: [0, 1, -1, 0, 80, 10] },
  ])(
    "preserves page geometry, strips signature objects, and never modifies input: %j",
    async (options) => {
      const { pdf } = await createSignaturePdf(options);
      const original = await pdf.save();
      const snapshot = original.slice();
      const progress = vi.fn();
      const merged = await bundle(original, progress);
      expect(merged.getPageCount()).toBe(2);
      expect(merged.getPage(1).getSize()).toEqual({ width: 300, height: 400 });
      expect(merged.getPage(1).getRotation().angle).toBe(options.rotation ?? 0);
      expect(merged.getPage(1).node.Annots()).toBeUndefined();
      expect(merged.catalog.has(key("AcroForm"))).toBe(false);
      expect(
        merged.context
          .enumerateIndirectObjects()
          .some(([, obj]) => obj instanceof PDFDict && obj.has(key("ByteRange"))),
      ).toBe(false);
      expect(merged.getTitle()).toContain("สำเนารวมเอกสารแนบ");
      expect(progress).toHaveBeenCalledWith(
        expect.stringContaining("เก็บต้นฉบับไว้ตรวจสอบลายเซ็นดิจิทัล"),
      );
      expect(original).toEqual(snapshot);
      expect((await PDFDocument.load(original)).getPage(0).node.Annots()?.size()).toBe(1);
    },
  );

  it("paints the actual appearance with its nonzero BBox mapped into the widget rectangle", async () => {
    const { pdf } = await createSignaturePdf();
    const merged = await bundle(await pdf.save());
    const page = merged.getPage(1);
    const xobjects = page.node.Resources()?.lookup(key("XObject"), PDFDict);
    const ref = xobjects?.keys().find((name) => name.toString().startsWith("/SignatureCopy"));
    expect(ref).toBeDefined();
    const appearance = rawStream(xobjects?.lookup(ref!));
    expect(Buffer.from(decodePDFRawStream(appearance).decode()).toString()).toContain("0 0 1 rg");
    const contents = page.node.Contents() as PDFArray;
    const operators = contents
      .asArray()
      .map((ref) =>
        Buffer.from(decodePDFRawStream(rawStream(merged.context.lookup(ref))).decode()).toString(),
      )
      .join("\n");
    expect(operators).toContain("2 0 0 2 20 10 cm");
    expect(operators).toContain("40 50 200 60 re");
  });

  it("keeps non-widget annotations", async () => {
    const { pdf, page } = await createSignaturePdf();
    page.node
      .Annots()
      ?.push(
        pdf.context.register(
          pdf.context.obj({ Type: "Annot", Subtype: "Link", Rect: [0, 0, 20, 20] }),
        ),
      );
    const merged = await bundle(await pdf.save());
    const annotations = merged.getPage(1).node.Annots();
    expect(annotations?.size()).toBe(1);
    expect(annotations?.lookup(0, PDFDict).lookup(key("Subtype"))?.toString()).toBe("/Link");
  });

  it("uses the selected appearance state instead of an arbitrary stream", async () => {
    const { pdf, widget } = await createSignaturePdf();
    const ap = widget.lookup(key("AP"), PDFDict);
    const normal = ap.get(key("N"))!;
    ap.set(key("N"), pdf.context.obj({ Signed: normal }));
    widget.set(key("AS"), key("Signed"));
    expect((await bundle(await pdf.save())).getPageCount()).toBe(2);
  });

  it.each(["missing-normal", "ambiguous-state", "invalid-bbox", "singular-matrix"])(
    "fails closed for %s",
    async (kind) => {
      const { pdf, widget } = await createSignaturePdf();
      const ap = widget.lookup(key("AP"), PDFDict);
      const stream = rawStream(ap.lookup(key("N")));
      if (kind === "missing-normal") ap.delete(key("N"));
      if (kind === "ambiguous-state")
        ap.set(key("N"), pdf.context.obj({ Signed: ap.get(key("N"))! }));
      if (kind === "invalid-bbox") stream.dict.set(key("BBox"), pdf.context.obj([0, 0, 0, 20]));
      if (kind === "singular-matrix")
        stream.dict.set(key("Matrix"), pdf.context.obj([0, 0, 0, 0, 0, 0]));
      await expect(bundle(await pdf.save())).rejects.toThrow("คงภาพลายเซ็นให้ครบไม่ได้");
    },
  );

  it("rejects orphan editable widgets, mixed forms, XFA, and cyclic field trees", async () => {
    const orphan = await createSignaturePdf({ orphan: true });
    orphan.widget.set(key("FT"), key("Tx"));
    expect(() => prepareStaticSignatureCopy(orphan.pdf, "orphan.pdf")).toThrow("ช่องกรอกข้อมูล");
    const mixed = await createSignaturePdf();
    mixed.pdf.getForm().createTextField("invoice").setText("INV-001");
    expect(() => prepareStaticSignatureCopy(mixed.pdf, "mixed.pdf")).toThrow("ช่องกรอกข้อมูล");
    const xfa = await createSignaturePdf();
    xfa.pdf.catalog.lookup(key("AcroForm"), PDFDict).set(key("XFA"), xfa.pdf.context.obj([]));
    expect(() => prepareStaticSignatureCopy(xfa.pdf, "xfa.pdf")).toThrow("ช่องกรอกข้อมูล");
    const cyclic = await createSignaturePdf();
    const ref = cyclic.pdf.context.register(cyclic.widget);
    cyclic.widget.set(key("Kids"), cyclic.pdf.context.obj([ref]));
    expect(() => prepareStaticSignatureCopy(cyclic.pdf, "cyclic.pdf")).toThrow("คงภาพลายเซ็น");
  });

  it("rejects widgets in the field tree that cannot be located on a page", async () => {
    const { pdf, page } = await createSignaturePdf();
    page.node.delete(key("Annots"));
    expect(() => prepareStaticSignatureCopy(pdf, "missing.pdf")).toThrow("คงภาพลายเซ็น");
  });

  it("does not reveal hidden signatures and rejects viewer-dependent visibility", async () => {
    const hidden = await createSignaturePdf();
    hidden.widget.set(key("F"), hidden.pdf.context.obj(2));
    const merged = await bundle(await hidden.pdf.save());
    expect(merged.getPage(1).node.Resources()?.lookup(key("XObject"), PDFDict).keys()).toHaveLength(
      0,
    );
    const noRotate = await createSignaturePdf({ rotation: 90 });
    noRotate.widget.set(key("F"), noRotate.pdf.context.obj(16));
    expect(() => prepareStaticSignatureCopy(noRotate.pdf, "rotated.pdf")).toThrow("คงภาพลายเซ็น");
    const layered = await createSignaturePdf();
    layered.widget.set(key("OC"), layered.pdf.context.obj({}));
    expect(() => prepareStaticSignatureCopy(layered.pdf, "layer.pdf")).toThrow("คงภาพลายเซ็น");
  });
});
