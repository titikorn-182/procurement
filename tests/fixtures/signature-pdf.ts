import { PDFDocument, PDFHexString, PDFName, PDFString, degrees } from "pdf-lib";

/** Synthetic appearance only: this fixture is not a cryptographically signed document. */
export async function createSignaturePdf(
  options: {
    appearance?: boolean;
    orphan?: boolean;
    inherited?: boolean;
    rotation?: number;
    matrix?: number[];
  } = {},
) {
  const pdf = await PDFDocument.create();
  const page = pdf.addPage([300, 400]);
  page.setRotation(degrees(options.rotation ?? 0));
  page.drawText("SYNTHETIC SIGNATURE TEST", { x: 20, y: 350, size: 12 });
  const signature = pdf.context.register(
    pdf.context.obj({
      Type: "Sig",
      Filter: "Adobe.PPKLite",
      SubFilter: "adbe.pkcs7.detached",
      ByteRange: [0, 10, 20, 30],
      Contents: PDFHexString.of("AABB"),
    }),
  );
  const widget = pdf.context.obj({
    Type: "Annot",
    Subtype: "Widget",
    FT: "Sig",
    T: PDFString.of("Signature1"),
    V: signature,
    Rect: [40, 50, 240, 110],
    P: page.ref,
    F: 4,
  });
  const widgetRef = pdf.context.register(widget);
  if (options.appearance !== false) {
    const stream = pdf.context.flateStream("0 0 1 rg 10 20 100 30 re f", {
      Type: "XObject",
      Subtype: "Form",
      BBox: [10, 20, 110, 50],
      Matrix: options.matrix ?? [1, 0, 0, 1, 0, 0],
      Resources: {},
    });
    widget.set(PDFName.of("AP"), pdf.context.obj({ N: pdf.context.register(stream) }));
  }
  let fieldRef = widgetRef;
  if (options.inherited) {
    const parent = pdf.context.obj({
      FT: "Sig",
      T: PDFString.of("Parent"),
      Kids: [widgetRef],
      V: signature,
    });
    fieldRef = pdf.context.register(parent);
    widget.delete(PDFName.of("FT"));
    widget.delete(PDFName.of("V"));
    widget.set(PDFName.of("Parent"), fieldRef);
  }
  page.node.set(PDFName.of("Annots"), pdf.context.obj([widgetRef]));
  if (!options.orphan)
    pdf.catalog.set(PDFName.of("AcroForm"), pdf.context.obj({ Fields: [fieldRef] }));
  return { pdf, page, widget };
}
