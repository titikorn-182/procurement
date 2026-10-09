import {
  PDFArray,
  PDFDict,
  PDFDocument,
  PDFName,
  PDFNumber,
  PDFStream,
  clip,
  concatTransformationMatrix,
  drawObject,
  endPath,
  popGraphicsState,
  pushGraphicsState,
  rectangle,
  type PDFObject,
  type PDFPage,
} from "pdf-lib";
import { PdfBundleError } from "./bundle-attachments";

const key = PDFName.of;
const maxFieldNodes = 10_000;
const maxParentDepth = 100;
const annotationFlags = { invisible: 1, hidden: 2, noRotate: 16, noView: 32 } as const;

function unsupportedForm(name: string): never {
  throw new PdfBundleError(
    `ไฟล์ “${name}” มีช่องกรอกข้อมูลที่ยังรวมอัตโนมัติไม่ได้ กรุณาบันทึกเป็น PDF แบบปกติก่อนแนบ เพื่อไม่ให้ข้อมูลในช่องกรอกสูญหาย`,
  );
}

function unsupportedAppearance(name: string): never {
  throw new PdfBundleError(
    `สร้างสำเนาไฟล์ “${name}” โดยคงภาพลายเซ็นให้ครบไม่ได้ กรุณาบันทึกสำเนาด้วยการพิมพ์เป็น PDF แล้วแนบใหม่ และเก็บต้นฉบับไว้ตรวจสอบลายเซ็นดิจิทัล`,
  );
}

/** Inspect the canonical field tree as well as page widgets, including orphan widgets. */
function inspectFields(input: PDFDocument, acroForm: PDFDict | undefined, name: string) {
  if (acroForm?.has(key("XFA"))) unsupportedForm(name);
  const fields = acroForm?.lookupMaybe(key("Fields"), PDFArray);
  const queue: { ref: PDFObject; type?: string }[] = (fields?.asArray() ?? []).map((ref) => ({
    ref,
  }));
  const types = new Map<PDFDict, string>();
  const seen = new Set<PDFDict>();
  const declaredWidgets = new Set<PDFDict>();
  for (let i = 0; i < queue.length; i += 1) {
    if (i >= maxFieldNodes) unsupportedAppearance(name);
    const node = input.context.lookup(queue[i].ref);
    if (!(node instanceof PDFDict) || seen.has(node)) unsupportedAppearance(name);
    seen.add(node);
    const type = node.lookupMaybe(key("FT"), PDFName)?.toString() ?? queue[i].type;
    const kids = node.lookupMaybe(key("Kids"), PDFArray);
    if ((type && type !== "/Sig") || (!type && !kids?.size())) unsupportedForm(name);
    if (type) types.set(node, type);
    if (node.lookupMaybe(key("Subtype"), PDFName)?.toString() === "/Widget") {
      declaredWidgets.add(node);
    }
    for (const ref of kids?.asArray() ?? []) queue.push({ ref, type });
  }
  return { types, declaredWidgets };
}

function fieldType(widget: PDFDict, types: Map<PDFDict, string>, name: string): string | undefined {
  const seen = new Set<PDFDict>();
  let node: PDFDict | undefined = widget;
  while (node) {
    if (seen.has(node) || seen.size >= maxParentDepth) unsupportedAppearance(name);
    seen.add(node);
    const type = node.lookupMaybe(key("FT"), PDFName)?.toString() ?? types.get(node);
    if (type) return type;
    node = node.lookupMaybe(key("Parent"), PDFDict);
  }
}

function readNumberArray(dict: PDFDict, entry: string, count: number, name: string): number[] {
  const values = dict.lookupMaybe(key(entry), PDFArray);
  if (!values || values.size() !== count) unsupportedAppearance(name);
  return values.asArray().map((_, i) => {
    const value = values.lookup(i, PDFNumber).asNumber();
    if (!Number.isFinite(value)) unsupportedAppearance(name);
    return value;
  });
}

function paintSignature(input: PDFDocument, page: PDFPage, widget: PDFDict, name: string) {
  const flags = widget.lookupMaybe(key("F"), PDFNumber)?.asNumber() ?? 0;
  if (!Number.isSafeInteger(flags) || flags < 0) unsupportedAppearance(name);
  // Invisible or hidden widgets have no visible appearance to preserve.
  if (flags & (annotationFlags.invisible | annotationFlags.hidden)) return;
  const appearances = widget.lookupMaybe(key("AP"), PDFDict);
  // Some signers place the visible signature directly in page content and leave
  // an invisible certification widget without AP. Keep that page content intact.
  if (!appearances) return;
  let appearance = appearances.lookup(key("N"));
  if (appearance instanceof PDFDict) {
    const state = widget.lookupMaybe(key("AS"), PDFName);
    if (!state) unsupportedAppearance(name);
    appearance = appearance.lookup(state);
  }
  if (!(appearance instanceof PDFStream)) unsupportedAppearance(name);
  if (
    flags & annotationFlags.noView ||
    (flags & annotationFlags.noRotate && page.getRotation().angle !== 0) ||
    widget.has(key("OC"))
  ) {
    unsupportedAppearance(name);
  }
  const rect = readNumberArray(widget, "Rect", 4, name);
  const left = Math.min(rect[0], rect[2]);
  const bottom = Math.min(rect[1], rect[3]);
  const width = Math.abs(rect[2] - rect[0]);
  const height = Math.abs(rect[3] - rect[1]);
  if (!width || !height) return;
  if (appearance.dict.lookupMaybe(key("Subtype"), PDFName)?.toString() !== "/Form") {
    unsupportedAppearance(name);
  }
  const [x0, y0, x1, y1] = readNumberArray(appearance.dict, "BBox", 4, name);
  const [a, b, c, d, e, f] = appearance.dict.has(key("Matrix"))
    ? readNumberArray(appearance.dict, "Matrix", 6, name)
    : [1, 0, 0, 1, 0, 0];
  // PDF annotation appearance mapping: transform BBox by Matrix, then fit the
  // resulting bounds to Rect. Do not assume the appearance starts at (0, 0).
  const corners = [
    [x0, y0],
    [x0, y1],
    [x1, y0],
    [x1, y1],
  ];
  const xs = corners.map(([x, y]) => a * x + c * y + e);
  const ys = corners.map(([x, y]) => b * x + d * y + f);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const spanX = Math.max(...xs) - minX;
  const spanY = Math.max(...ys) - minY;
  if (spanX <= 0 || spanY <= 0 || a * d - b * c === 0) unsupportedAppearance(name);
  const sx = width / spanX;
  const sy = height / spanY;
  const tx = left - sx * minX;
  const ty = bottom - sy * minY;
  if (![sx, sy, tx, ty].every(Number.isFinite)) unsupportedAppearance(name);
  const object = page.node.newXObject("SignatureCopy", input.context.register(appearance));
  page.pushOperators(
    pushGraphicsState(),
    rectangle(left, bottom, width, height),
    clip(),
    endPath(),
    concatTransformationMatrix(sx, 0, 0, sy, tx, ty),
    drawObject(object),
    popGraphicsState(),
  );
}

/**
 * Prepare an in-memory, static convenience copy. Never validate, re-sign, or
 * write back source bytes. Only standard signature fields are supported;
 * editable forms/XFA and ambiguous appearances fail closed rather than lose data.
 */
export function prepareStaticSignatureCopy(input: PDFDocument, name: string): boolean {
  const acroForm = input.catalog.lookupMaybe(key("AcroForm"), PDFDict);
  const { types, declaredWidgets } = inspectFields(input, acroForm, name);
  let copied = types.size > 0 || input.catalog.has(key("Perms"));
  const seenWidgets = new Set<PDFDict>();
  for (const page of input.getPages()) {
    const annotations = page.node.Annots();
    if (!annotations) continue;
    const retained = input.context.obj([]);
    for (const ref of annotations.asArray()) {
      const annotation = input.context.lookup(ref);
      if (!(annotation instanceof PDFDict)) unsupportedAppearance(name);
      if (annotation.lookupMaybe(key("Subtype"), PDFName)?.toString() !== "/Widget") {
        retained.push(ref);
        continue;
      }
      if (fieldType(annotation, types, name) !== "/Sig") unsupportedForm(name);
      if (seenWidgets.has(annotation)) unsupportedAppearance(name);
      seenWidgets.add(annotation);
      paintSignature(input, page, annotation, name);
      copied = true;
    }
    // Sever widget -> field -> signature references before copyPages. Merely
    // removing AcroForm would leave invalid signature objects in page annotations.
    if (retained.size()) page.node.set(key("Annots"), retained);
    else page.node.delete(key("Annots"));
  }
  for (const widget of declaredWidgets) {
    if (!seenWidgets.has(widget)) unsupportedAppearance(name);
  }
  input.catalog.delete(key("AcroForm"));
  input.catalog.delete(key("Perms"));
  return copied;
}
