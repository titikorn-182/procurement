"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { paginateDocument } from "@/lib/pdf/paginate-document";
import styles from "./document.module.css";

type Props = {
  title: string;
  formCode: string;
  identifier: string;
  footer: string;
  targetId: string;
  fontClassName: string;
  children: ReactNode;
};

export function PaginatedDocument({
  title,
  formCode,
  identifier,
  footer,
  targetId,
  fontClassName,
  children,
}: Props) {
  const sourceRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    async function prepare() {
      const source = sourceRef.current;
      const pages = pagesRef.current;
      if (!source || !pages) return;
      pages.dataset.pdfReady = "loading";
      try {
        const family = getComputedStyle(source).fontFamily;
        await Promise.all([
          document.fonts.load(`16px ${family}`),
          document.fonts.load(`700 16px ${family}`),
        ]);
        await document.fonts.ready;
        const emblem = new Image();
        emblem.src = "/ubu-emblem.png";
        await emblem.decode();
        if (cancelled) return;
        paginateDocument(source, pages);
        pages.dataset.pdfReady = "ready";
        setError("");
      } catch {
        if (cancelled) return;
        pages.replaceChildren();
        pages.dataset.pdfReady = "error";
        setError(
          "จัดหน้าเอกสารไม่สำเร็จ กรุณาโหลดหน้าใหม่ หากรายการใดยาวเกินหนึ่งหน้า ให้แยกรายการก่อนพิมพ์",
        );
      }
    }
    void prepare();
    return () => {
      cancelled = true;
    };
  }, [children, fontClassName, title, formCode, identifier, footer]);

  return (
    <>
      <p className={`print-hidden ${styles.hint}`}>
        {title} {formCode} · กระดาษ A4 · TH SarabunPSK
      </p>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
      <div
        className={styles.preview}
        role="region"
        aria-label={`ตัวอย่างเอกสาร ${formCode} เลื่อนแนวนอนเพื่อดูเต็มหน้า`}
        tabIndex={0}
      >
        <div
          id={targetId}
          ref={pagesRef}
          className={styles.pages}
          data-pdf-ready="loading"
          aria-label="เอกสารสำหรับพิมพ์และดาวน์โหลด"
        />
      </div>
      <div ref={sourceRef} className={`${styles.source} ${fontClassName}`} aria-hidden="true">
        <div data-page-template>
          <section className={`${styles.page} ${fontClassName}`}>
            <header className={styles.heading}>
              {/* The PDF capture embeds the original emblem asset. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.emblem}
                src="/ubu-emblem.png"
                width={56}
                height={72}
                alt="ตรามหาวิทยาลัยอุบลราชธานี"
              />
              <h1 className={styles.title}>{title}</h1>
              <div className={styles.identifier}>
                <div className={styles.formCode}>พัสดุ {formCode}</div>
                <div>{identifier}</div>
              </div>
            </header>
            <div data-page-body className={styles.body} />
            <footer className={styles.footer}>
              <span>{footer}</span>
              <span data-page-number />
            </footer>
          </section>
        </div>
        <div data-document-content>{children}</div>
      </div>
    </>
  );
}
