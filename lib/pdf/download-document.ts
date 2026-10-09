export async function createPaginatedDocumentPdf(documentElement: HTMLElement, fileName: string) {
  const [{ toCanvas, getFontEmbedCSS }, { jsPDF }] = await Promise.all([
    import("html-to-image"),
    import("jspdf"),
  ]);
  const pages = Array.from(documentElement.querySelectorAll<HTMLElement>("[data-pdf-page]"));
  if (!pages.length) throw new Error("Document is not ready");
  const pdf = new jsPDF({ unit: "mm", format: "a4", compress: true });
  pdf.setProperties({
    title: fileName.replace(/\.pdf$/i, ""),
    creator: "ระบบบริหารงานพัสดุ คณะรัฐศาสตร์",
  });
  const fontEmbedCSS = await getFontEmbedCSS(pages[0]);

  for (const [index, page] of pages.entries()) {
    const clone = page.cloneNode(true) as HTMLElement;
    const host = document.createElement("div");
    host.setAttribute("aria-hidden", "true");
    Object.assign(host.style, {
      position: "fixed",
      left: "0",
      top: "0",
      width: "210mm",
      pointerEvents: "none",
      background: "white",
      zIndex: "-1",
    });
    Object.assign(clone.style, { margin: "0", boxShadow: "none" });
    host.append(clone);
    document.body.append(host);
    try {
      // Keep the isolated page at the viewport origin, behind the app, and wait
      // for a paint. Chromium can cull grid headings far outside the viewport.
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
      const canvas = await captureCompletePage(
        () =>
          toCanvas(clone, {
            backgroundColor: "#ffffff",
            pixelRatio: 3,
            fontEmbedCSS,
            width: page.offsetWidth,
            height: page.offsetHeight,
          }),
        clone,
        () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
          ),
      );
      if (index > 0) pdf.addPage();
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", 0, 0, 210, 297, undefined, "FAST");
    } finally {
      host.remove();
    }
  }
  return pdf;
}

export async function downloadPaginatedDocument(documentElement: HTMLElement, fileName: string) {
  const pdf = await createPaginatedDocumentPdf(documentElement, fileName);
  await pdf.save(fileName, { returnPromise: true });
}
import { captureCompletePage } from "./verify-capture";
