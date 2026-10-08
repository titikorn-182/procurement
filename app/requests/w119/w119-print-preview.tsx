"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/app/components/ui";
import { PrintButton } from "../[id]/print/print-button";
import { W119Document } from "./w119-document";
import { w119PdfFileName, type W119PrintData } from "./w119-print-data";
import type { SelectedAttachment } from "@/app/lib/request-attachments";
import { toLocalBundleAttachments } from "@/lib/pdf/bundle-attachments";

export function W119PrintPreview({
  data,
  fontClassName,
  onClose,
  attachments = [],
}: {
  data: W119PrintData;
  fontClassName: string;
  onClose: () => void;
  attachments?: readonly SelectedAttachment[];
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [busy, setBusy] = useState(false);
  const bundleAttachments = useMemo(() => toLocalBundleAttachments(attachments), [attachments]);
  const preview = useMemo(
    () => <W119Document data={data} targetId="w119-print-document" fontClassName={fontClassName} />,
    [data, fontClassName],
  );
  useEffect(() => headingRef.current?.focus(), []);
  return (
    <section className="min-w-0" aria-labelledby="w119-preview-heading">
      <div className="print-hidden mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            id="w119-preview-heading"
            ref={headingRef}
            tabIndex={-1}
            className="text-xl font-bold focus:outline-none"
          >
            ตัวอย่างเอกสาร ว119
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            ฉบับร่างจากข้อมูลที่กรอก การพิมพ์หรือดาวน์โหลดจะไม่บันทึกหรือส่งคำขอ
            ช่องผู้ลงนามที่ยังไม่มีข้อมูลจะเว้นว่างไว้
          </p>
        </div>
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          <ArrowLeft size={17} aria-hidden="true" /> กลับไปแก้ไขข้อมูล
        </Button>
      </div>
      <div className="print-hidden mb-4">
        <PrintButton
          targetId="w119-print-document"
          fileName={w119PdfFileName(data.requestNo)}
          paginated
          isolatePrint
          onBusyChange={setBusy}
          attachments={bundleAttachments}
        />
      </div>
      {preview}
    </section>
  );
}
