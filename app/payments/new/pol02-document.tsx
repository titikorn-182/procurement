"use client";

import type { ReactNode } from "react";
import { PaginatedDocument } from "@/app/components/print/paginated-document";
import shared from "@/app/components/print/document.module.css";
import { formatDocumentMoney as money, formatThaiDocumentDate } from "@/lib/pdf/format";
import { toThaiBahtText } from "./pol02";
import type { Pol02PrintData } from "./pol02-print-data";
import styles from "./pol02-document.module.css";

const value = (text: string) => text.trim() || "—";
const date = (text: string) => formatThaiDocumentDate(text) || "—";

function Field({
  label,
  children,
  full = false,
}: {
  label: string;
  children: ReactNode;
  full?: boolean;
}) {
  return (
    <div className={`${shared.field} ${full ? shared.full : ""}`}>
      <strong className={shared.label}>{label}</strong>
      <span className={shared.line}>{children}</span>
    </div>
  );
}

export function Pol02Document({
  data,
  targetId,
  fontClassName,
}: {
  data: Pol02PrintData;
  targetId: string;
  fontClassName: string;
}) {
  const { source, details } = data;
  return (
    <PaginatedDocument
      title="ใบขอเบิกจ่ายจัดซื้อจัดจ้าง"
      formCode="POL - 02"
      identifier="ฉบับร่างก่อนส่งคำขอ"
      footer={`POL-02 ฉบับร่าง · อ้างอิง ${source.requestNo}`}
      targetId={targetId}
      fontClassName={fontClassName}
    >
      <div className={`${shared.memo} ${styles.memo}`}>
        <Field label="ส่วนงาน">คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี</Field>
        <Field label="วันที่จัดทำ">{data.documentDate}</Field>
        <Field label="หน่วยงาน">{value(source.departmentName)}</Field>
        <Field label="ผู้ขอเบิก">{value(source.requesterName)}</Field>
        <Field label="เรื่อง" full>
          {value(details.subject)}
        </Field>
        <Field label="เรียน" full>
          คณบดีคณะรัฐศาสตร์
        </Field>
        <Field label="อ้างอิงคำขอ">{source.requestNo}</Field>
        <Field label="วันที่เห็นชอบ">{date(details.approvalDate)}</Field>
        <Field label="โครงการ/กิจกรรม" full>
          {value(details.projectActivity)}
        </Field>
      </div>
      <p className={styles.intro}>
        มีความประสงค์ขอเบิกจ่ายค่าจัดซื้อจัดจ้าง ตามรายละเอียดและหลักฐานประกอบดังต่อไปนี้
      </p>
      <div className={`${shared.memo} ${styles.memo}`}>
        <Field label="ผู้ประกอบการ/ร้านค้า" full>
          {value(details.vendorName)}
        </Field>
        <Field label="เลขผู้เสียภาษี">{value(details.vendorTaxId)}</Field>
        <Field label="วิธีจัดซื้อจัดจ้าง">{value(details.procurementMethod)}</Field>
        <Field label="เลขโครงการ e-GP" full>
          {value(details.egpProjectNo)}
        </Field>
        <Field label="เลขที่สัญญา/ใบสั่ง">{value(details.contractNo)}</Field>
        <Field label="ลงวันที่">{date(details.contractDate)}</Field>
        <Field label="วงเงินตามสัญญา">{money(data.contractAmount)} บาท</Field>
        <Field label="ขอเบิกงวดที่">
          {value(details.installmentNumber)} / {value(details.installmentCount)} งวด
        </Field>
        <Field label="เลขที่ใบแจ้งหนี้/ใบเสร็จ">{value(details.invoiceNo)}</Field>
        <Field label="ลงวันที่">{date(details.invoiceDate)}</Field>
      </div>
      <table
        className={`${shared.items} ${styles.items}`}
        aria-label="รายละเอียดจำนวนเงินที่ขอเบิก"
      >
        <colgroup>
          {[6, 29, 15, 14, 8, 13, 15].map((width, index) => (
            <col key={index} style={{ width: `${width}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {[
              "ลำดับ",
              "รายการ",
              "ประเภทเอกสาร",
              "เลขที่เอกสาร",
              "จำนวน",
              "หน่วยละ",
              "จำนวนเงิน",
            ].map((label) => (
              <th key={label} scope="col">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.items.map((item) => (
            <tr key={item.lineNo}>
              <td className={shared.center}>{item.lineNo}</td>
              <td>{value(item.description)}</td>
              <td>{value(item.attachmentType)}</td>
              <td>{value(item.documentNo)}</td>
              <td className={shared.number}>
                {item.quantity.toLocaleString("th-TH", { maximumFractionDigits: 2 })}
              </td>
              <td className={shared.number}>{money(item.unitPrice)}</td>
              <td className={shared.number}>{money(item.total)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.totals}>
        <dl>
          <div>
            <dt>มูลค่าก่อนภาษี</dt>
            <dd>{money(data.subtotal)} บาท</dd>
          </div>
          <div>
            <dt>ภาษีมูลค่าเพิ่ม</dt>
            <dd>{money(data.vat)} บาท</dd>
          </div>
          <div className={styles.grandTotal}>
            <dt>รวมเงินขอเบิก</dt>
            <dd>{money(data.total)} บาท</dd>
          </div>
        </dl>
        <p>
          จำนวนเงินตัวอักษร <strong>({toThaiBahtText(data.total)})</strong>
        </p>
      </div>
      <p data-flow-text className={styles.prose}>
        รายละเอียดการส่งมอบและผลการตรวจรับ: {value(details.delivery)}
      </p>
      <section className={styles.budget}>
        <h2>รายละเอียดแหล่งงบประมาณ</h2>
        <dl className={styles.budgetGrid}>
          {[
            ["ปีงบประมาณ", String(source.budgetYear)],
            ["แหล่งเงิน", source.fundSource],
            ["แผนงาน", source.planName],
            ["หมวดรายจ่าย", source.expenseCategory],
            ["รหัสหน่วยงาน", source.departmentCode],
            ["รหัสกองทุน", source.fundCode],
            ["รหัสกิจกรรม", source.activityCode],
            ["วงเงินอนุมัติ", `${money(source.approved)} บาท`],
            ["เบิกแล้ว/อยู่ระหว่างดำเนินการ", `${money(source.paid)} บาท`],
            ["คงเหลือก่อนเบิกครั้งนี้", `${money(source.approved - source.paid)} บาท`],
          ].map(([label, text]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value(text)}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className={styles.documentsHeading}>
        <h2>เอกสารประกอบการเบิกจ่าย</h2>
        {data.documents.length === 0 && <p>ยังไม่ได้เลือกรายการเอกสารประกอบ</p>}
        {data.documents.map((label, index) => (
          <p className={styles.document} key={label}>
            {index + 1}. {label}
          </p>
        ))}
      </div>
      <div>
        <p className={styles.document}>
          <strong>ไฟล์แนบ {data.attachments.length} ไฟล์</strong>
        </p>
        {data.attachments[0] && <p className={styles.document}>1. {data.attachments[0]}</p>}
      </div>
      {data.attachments.slice(1).map((name, index) => (
        <p className={styles.document} key={`${index}-${name}`}>
          {index + 2}. {name}
        </p>
      ))}
      <div className={styles.signatures}>
        {["ผู้ขอเบิกจ่าย", "ผู้ตรวจสอบเอกสาร"].map((label, index) => (
          <div key={label}>
            <p>
              ลงชื่อ <span className={styles.signatureLine} /> {label}
            </p>
            <p className={styles.signatureName}>
              ({" "}
              {index === 0
                ? value(source.requesterName)
                : "................................................"}{" "}
              )
            </p>
            <p>ตำแหน่ง ............................................................</p>
            <p>วันที่ ............ / ........................ / ............</p>
          </div>
        ))}
      </div>
    </PaginatedDocument>
  );
}
