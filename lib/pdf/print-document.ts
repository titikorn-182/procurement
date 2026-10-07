import styles from "./print-document.module.css";

/** Print only the prepared pages without the application shell or form controls. */
export async function printPaginatedDocument(documentElement: HTMLElement): Promise<void> {
  if (documentElement.dataset.pdfReady !== "ready") throw new Error("Document is not ready");
  const pages = documentElement.querySelectorAll<HTMLElement>("[data-pdf-page]");
  if (!pages.length) throw new Error("No document pages");
  const host = document.createElement("div");
  host.className = styles.printRoot;
  host.setAttribute("aria-hidden", "true");
  host.dataset.documentPrintRoot = "";
  pages.forEach((page) => host.append(page.cloneNode(true)));
  await document.fonts.ready;

  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      host.remove();
      window.removeEventListener("afterprint", done);
    };
    const done = () => {
      cleanup();
      resolve();
    };
    window.addEventListener("afterprint", done, { once: true });
    document.body.append(host);
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        try {
          window.print();
        } catch (error) {
          cleanup();
          reject(error);
        }
      }),
    );
  });
}
