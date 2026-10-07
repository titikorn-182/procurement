"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/app/components/ui";
import { PrintButton } from "@/app/requests/[id]/print/print-button";
import { Pol02Document } from "./pol02-document";
import { pol02DraftFileName, type Pol02PrintData } from "./pol02-print-data";

export function PaymentPrintPreview({
  data,
  fontClassName,
  onClose,
}: {
  data: Pol02PrintData;
  fontClassName: string;
  onClose: () => void;
}) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const [busy, setBusy] = useState(false);
  // Keep prepared pages mounted while export controls report progress.
  const preview = useMemo(
    () => (
      <Pol02Document data={data} targetId="payment-print-document" fontClassName={fontClassName} />
    ),
    [data, fontClassName],
  );
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  return (
    <section className="mt-6 min-w-0" aria-labelledby="payment-preview-heading">
      <div className="print-hidden mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2
            id="payment-preview-heading"
            tabIndex={-1}
            ref={headingRef}
            className="text-xl font-bold"
          >
            ตัวอย่างเอกสาร POL-02
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-stone-600">
            ฉบับร่างจากข้อมูลที่กรอก การพิมพ์หรือดาวน์โหลดจะไม่บันทึกหรือส่งคำขอเข้าสายอนุมัติ
          </p>
        </div>
        <Button variant="secondary" onClick={onClose} disabled={busy}>
          <ArrowLeft size={17} aria-hidden="true" />
          กลับไปแก้ไขข้อมูล
        </Button>
      </div>
      <div className="print-hidden mb-4">
        <PrintButton
          targetId="payment-print-document"
          fileName={pol02DraftFileName(data.source.requestNo)}
          paginated
          isolatePrint
          onBusyChange={setBusy}
        />
      </div>
      {preview}
    </section>
  );
}
