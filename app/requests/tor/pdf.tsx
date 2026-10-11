"use client";
import { createRoot } from "react-dom/client";
import { createPaginatedDocumentPdf } from "@/lib/pdf/download-document";
import { torCategoryLabel, type TorDocument } from "./model";
import type { SelectedAttachment } from "@/app/lib/request-attachments";

/** Render an isolated latest snapshot, never a stale preview or user-authored attachment. */
export async function createTorAttachment(data: TorDocument): Promise<SelectedAttachment> {
  const { TorPrintDocument } = await import("./document");
  const host = document.createElement("div");
  host.setAttribute("aria-hidden", "true");
  Object.assign(host.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: "210mm",
    zIndex: "-1",
    pointerEvents: "none",
  });
  document.body.append(host);
  const root = createRoot(host);
  try {
    root.render(<TorPrintDocument data={data} />);
    const element = await new Promise<HTMLElement>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        observer.disconnect();
        reject(new Error("จัดหน้า TOR ไม่สำเร็จ กรุณาลองใหม่"));
      }, 30000);
      const observer = new MutationObserver(() => {
        const target = host.querySelector<HTMLElement>("[data-pdf-ready]");
        if (target?.dataset.pdfReady === "ready" || target?.dataset.pdfReady === "error") {
          clearTimeout(timeout);
          observer.disconnect();
          if (target.dataset.pdfReady === "ready") resolve(target);
          else reject(new Error("จัดหน้า TOR ไม่สำเร็จ กรุณาตรวจสอบความยาวข้อความ"));
        }
      });
      observer.observe(host, { childList: true, subtree: true, attributes: true });
    });
    const name = `TOR-${torCategoryLabel(data.category)}.pdf`;
    const pdf = await createPaginatedDocumentPdf(element, name);
    return {
      id: data.attachmentId,
      file: new File([pdf.output("blob")], name, { type: "application/pdf" }),
    };
  } finally {
    root.unmount();
    host.remove();
  }
}

export async function createTorAttachments(docs: TorDocument[]) {
  const results: SelectedAttachment[] = [];
  for (const doc of docs) results.push(await createTorAttachment(doc));
  return results;
}
