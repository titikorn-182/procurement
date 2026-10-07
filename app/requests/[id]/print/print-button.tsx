"use client";

import { useEffect, useState } from "react";
import { Download, LoaderCircle, Printer } from "lucide-react";
import { PdfBundleError, type PdfBundleAttachment } from "@/lib/pdf/bundle-attachments";

type PrintButtonProps = {
  targetId: string;
  fileName: string;
  paginated?: boolean;
  isolatePrint?: boolean;
  onBusyChange?: (busy: boolean) => void;
  attachments?: readonly PdfBundleAttachment[];
};

export function PrintButton({
  targetId,
  fileName,
  paginated = false,
  isolatePrint = false,
  onBusyChange,
  attachments = [],
}: PrintButtonProps) {
  const [generationMode, setGenerationMode] = useState<"form" | "bundle" | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const isGenerating = generationMode !== null;
  const hasAttachments = paginated && attachments.length > 0;
  useEffect(() => {
    onBusyChange?.(isGenerating || isPrinting);
  }, [isGenerating, isPrinting, onBusyChange]);

  async function downloadPdf(includeAttachments = false) {
    const documentElement = document.getElementById(targetId);
    if (!(documentElement instanceof HTMLElement)) {
      setError("ไม่พบเอกสารสำหรับสร้าง PDF กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง");
      return;
    }
    if (paginated && documentElement.dataset.pdfReady !== "ready") {
      setError("เอกสารยังไม่พร้อม กรุณารอจัดหน้าให้เสร็จ หรือโหลดหน้าใหม่แล้วลองอีกครั้ง");
      return;
    }

    setError("");
    setProgress("");
    setGenerationMode(includeAttachments ? "bundle" : "form");

    try {
      await document.fonts.ready;
      if (includeAttachments && hasAttachments) {
        const { downloadRequestBundle } = await import("@/lib/pdf/download-request-bundle");
        await downloadRequestBundle(documentElement, fileName, attachments, setProgress);
        return;
      }
      if (paginated) {
        const { downloadPaginatedDocument } = await import("@/lib/pdf/download-document");
        await downloadPaginatedDocument(documentElement, fileName);
        return;
      }
      const [{ toCanvas }, { jsPDF }] = await Promise.all([
        import("html-to-image"),
        import("jspdf"),
      ]);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4", compress: true });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const explicitPages = Array.from(
        documentElement.querySelectorAll<HTMLElement>("[data-pdf-page]"),
      );
      const captureTargets = explicitPages.length > 0 ? explicitPages : [documentElement];
      let pdfPageCount = 0;

      for (const captureTarget of captureTargets) {
        // Capture a viewport-independent clone at the top of an off-screen host.
        // Capturing a page that sits below another A4 page can otherwise inherit a
        // negative vertical offset in Chromium and clip the next page's heading.
        const captureHost = document.createElement("div");
        const captureClone = captureTarget.cloneNode(true);
        if (!(captureClone instanceof HTMLElement)) {
          throw new Error("capture clone unavailable");
        }

        Object.assign(captureHost.style, {
          background: "#ffffff",
          left: "-10000px",
          pointerEvents: "none",
          position: "fixed",
          top: "0",
          width: `${captureTarget.clientWidth}px`,
          zIndex: "-1",
        });
        Object.assign(captureClone.style, {
          boxShadow: "none",
          margin: "0",
        });
        if (pdfPageCount > 0) {
          // Chromium's SVG foreignObject capture can consume the root page's
          // top padding after the first A4 canvas. Add the same inset inside the
          // isolated clone so later-page headings retain the intended margin.
          const topInset = document.createElement("div");
          topInset.style.height = "14mm";
          topInset.setAttribute("aria-hidden", "true");
          captureClone.prepend(topInset);
        }
        captureHost.setAttribute("aria-hidden", "true");
        captureHost.appendChild(captureClone);
        document.body.appendChild(captureHost);

        let sourceCanvas: HTMLCanvasElement;
        try {
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          sourceCanvas = await toCanvas(captureClone, {
            backgroundColor: "#ffffff",
            cacheBust: true,
            pixelRatio: 2,
            preferredFontFormat: "woff2",
          });
        } finally {
          captureHost.remove();
        }
        const pixelsPerMillimeter = sourceCanvas.width / pageWidth;
        // Round up so sub-pixel differences at exactly A4 height do not create a blank trailing page.
        const pageHeightInPixels = Math.ceil(pageHeight * pixelsPerMillimeter);

        for (let offset = 0; offset < sourceCanvas.height; offset += pageHeightInPixels) {
          const sliceHeight = Math.min(pageHeightInPixels, sourceCanvas.height - offset);
          const pageCanvas = document.createElement("canvas");
          pageCanvas.width = sourceCanvas.width;
          pageCanvas.height = sliceHeight;
          const context = pageCanvas.getContext("2d");
          if (!context) throw new Error("canvas context unavailable");

          context.fillStyle = "#ffffff";
          context.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
          context.drawImage(
            sourceCanvas,
            0,
            offset,
            sourceCanvas.width,
            sliceHeight,
            0,
            0,
            pageCanvas.width,
            pageCanvas.height,
          );

          if (pdfPageCount > 0) pdf.addPage("a4", "portrait");
          pdf.addImage(
            pageCanvas.toDataURL("image/jpeg", 0.96),
            "JPEG",
            0,
            0,
            pageWidth,
            sliceHeight / pixelsPerMillimeter,
            undefined,
            "FAST",
          );
          pdfPageCount += 1;
        }
      }

      await pdf.save(fileName, { returnPromise: true });
    } catch (error) {
      setError(
        error instanceof PdfBundleError
          ? error.message
          : "สร้างไฟล์ PDF ไม่สำเร็จ กรุณาลองใหม่ หรือใช้ปุ่มพิมพ์เป็นทางเลือก",
      );
    } finally {
      setGenerationMode(null);
      setProgress("");
    }
  }

  return (
    <div className="print-hidden flex min-w-0 max-w-full flex-col items-end gap-2">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {hasAttachments && (
          <button
            type="button"
            className="inline-flex min-h-10 items-center justify-center gap-2 border border-[var(--orange-dark)] bg-[var(--orange)] px-4 font-semibold text-white transition hover:bg-[var(--orange-dark)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-wait disabled:opacity-70"
            onClick={() => downloadPdf(true)}
            disabled={isGenerating || isPrinting}
          >
            {generationMode === "bundle" ? (
              <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />
            ) : (
              <Download size={17} aria-hidden="true" />
            )}
            {generationMode === "bundle" ? "กำลังรวม PDF..." : "ดาวน์โหลด PDF รวมเอกสารแนบ"}
          </button>
        )}
        <button
          type="button"
          className={`inline-flex min-h-10 items-center justify-center gap-2 border px-4 font-semibold transition focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-wait disabled:opacity-70 ${hasAttachments ? "border-[var(--line-dark)] bg-white text-[var(--ink)] hover:bg-[var(--paper-warm)]" : "border-[var(--orange-dark)] bg-[var(--orange)] text-white hover:bg-[var(--orange-dark)]"}`}
          onClick={() => downloadPdf()}
          disabled={isGenerating || isPrinting}
        >
          {generationMode === "form" ? (
            <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />
          ) : (
            <Download size={17} aria-hidden="true" />
          )}
          {generationMode === "form"
            ? "กำลังสร้าง PDF..."
            : hasAttachments
              ? "ดาวน์โหลดเฉพาะแบบฟอร์ม"
              : "ดาวน์โหลด PDF"}
        </button>
        <button
          type="button"
          className="inline-flex min-h-10 items-center justify-center gap-2 border border-[var(--line-dark)] bg-white px-4 font-semibold text-[var(--ink)] transition hover:bg-[var(--paper-warm)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
          onClick={async () => {
            if (paginated && document.getElementById(targetId)?.dataset.pdfReady !== "ready") {
              setError("เอกสารยังไม่พร้อม กรุณารอจัดหน้าให้เสร็จ หรือโหลดหน้าใหม่แล้วลองอีกครั้ง");
              return;
            }
            setError("");
            setIsPrinting(true);
            try {
              await document.fonts.ready;
              if (isolatePrint) {
                const target = document.getElementById(targetId);
                if (!target) throw new Error("Document is unavailable");
                const { printPaginatedDocument } = await import("@/lib/pdf/print-document");
                await printPaginatedDocument(target);
              } else {
                window.print();
              }
            } catch {
              setError("เตรียมพิมพ์ไม่สำเร็จ กรุณาลองใหม่ หรือใช้ปุ่มดาวน์โหลด PDF");
            } finally {
              setIsPrinting(false);
            }
          }}
          disabled={isGenerating || isPrinting}
        >
          <Printer size={17} aria-hidden="true" />
          {isPrinting ? "กำลังเตรียมพิมพ์..." : hasAttachments ? "พิมพ์แบบฟอร์ม" : "พิมพ์"}
        </button>
      </div>
      {hasAttachments && (
        <p className="max-w-xl text-right text-sm text-[var(--ink)]">
          ต่อท้ายแบบฟอร์มด้วยเอกสารแนบ {attachments.length} ไฟล์ ตามลำดับอัปโหลด รองรับ PDF, JPG และ
          PNG
          <br />
          Word/Excel ต้องแปลงเป็น PDF ก่อนรวม ไฟล์ต้นฉบับไม่ถูกแก้ไข
        </p>
      )}
      {progress && (
        <p role="status" className="max-w-xl break-words text-right text-sm text-[var(--ink)]">
          {progress}
        </p>
      )}
      {error && (
        <p
          role="alert"
          className="max-w-md break-words text-right text-sm font-semibold text-[var(--red)]"
        >
          {error}
        </p>
      )}
    </div>
  );
}
