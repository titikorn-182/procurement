"use client";

import { Fragment } from "react";
import { PaginatedDocument } from "@/app/components/print/paginated-document";
import { sarabunPsk } from "@/app/components/print/fonts";
import { TOR_HEADINGS, torCategoryLabel, type TorDocument } from "./model";
import styles from "./document.module.css";

export function TorPrintDocument({ data }: { data: TorDocument }) {
  return (
    <PaginatedDocument
      title="แบบรายละเอียดคุณลักษณะเฉพาะ"
      formCode="TOR"
      identifier={torCategoryLabel(data.category)}
      targetId={`tor-pdf-${data.attachmentId}`}
      fontClassName={sarabunPsk.className}
      pageClassName={styles.page}
      header={<div className={styles.running}>{torCategoryLabel(data.category)}</div>}
      footer="คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี"
      verifyCapture
    >
      <h1 className={styles.title} data-pdf-required-content>
        แบบรายละเอียดคุณลักษณะเฉพาะ (Terms of Reference : TOR)
      </h1>
      <p data-flow-text className={styles.center}>
        เพื่อประกอบเอกสารขอซื้อ/จ้าง {data.subject || "................................"}
      </p>
      <p data-flow-text className={styles.center}>
        โครงการ {data.project || "................................"}
      </p>
      {TOR_HEADINGS.map((heading, index) => (
        <Fragment key={heading}>
          <h2
            className={styles.heading}
            data-page-break-before={index === 3 || index === 10 ? "" : undefined}
          >
            {index + 1}. {heading}
          </h2>
          <p
            data-flow-text
            className={`${styles.prose} ${index === 3 ? styles.specification : ""}`}
          >
            {data.sections[index].trim() ||
              "................................................................................"}
          </p>
        </Fragment>
      ))}
      {data.authors.map((author, index) => (
        <div className={styles.signature} key={index}>
          <p>ลงชื่อ ................................................ ผู้จัดทำขอบเขตงาน</p>
          <p>({author.name || "................................................"})</p>
          <p>ตำแหน่ง {author.position || "................................................"}</p>
        </div>
      ))}
    </PaginatedDocument>
  );
}
