"use client";

import type { ReactNode } from "react";
import { PaginatedDocument } from "@/app/components/print/paginated-document";
import { toThaiBahtText } from "@/app/payments/new/pol02";
import { formatDocumentMoney as money, formatThaiDocumentDate as date } from "@/lib/pdf/format";
import { SIGNATORY_ROLES, type Section79Draft } from "./model";
import styles from "./document.module.css";

const blank = "........................................";
const shortBlank = "....................";
const value = (text: string) => text.trim() || blank;

function Prose({ children, indent = true }: { children: ReactNode; indent?: boolean }) {
  return (
    <p data-flow-text className={`${styles.prose} ${indent ? styles.indent : ""}`}>
      {children}
    </p>
  );
}

function EmptyChoice({ children }: { children: ReactNode }) {
  return (
    <p className={styles.choice}>
      <span className={styles.checkbox} data-empty-decision aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

function Opinion({ index, data }: { index: number; data: Section79Draft }) {
  const person = data.signatories[index];
  return (
    <td data-opinion={index + 1}>
      <h2 className={styles.opinionTitle}>
        ({index + 1}) {SIGNATORY_ROLES[index]}
      </h2>
      <div className={styles.opinionSpace}>
        {index === 1 ? (
          <>
            <EmptyChoice>เพื่อโปรดพิจารณาเห็นชอบ/อนุมัติตามเสนอ</EmptyChoice>
            <EmptyChoice>อื่น ๆ {shortBlank}</EmptyChoice>
          </>
        ) : index === 3 ? (
          <>
            <EmptyChoice>เพื่อโปรดพิจารณาเห็นชอบ/อนุมัติตามเสนอ</EmptyChoice>
            <EmptyChoice>มีงบประมาณ สามารถเบิกจ่ายได้</EmptyChoice>
            <EmptyChoice>มีงบประมาณไม่เพียงพอ ไม่สามารถเบิกจ่ายได้</EmptyChoice>
            <EmptyChoice>อื่น ๆ {shortBlank}</EmptyChoice>
          </>
        ) : index === 5 ? (
          <>
            <EmptyChoice>เห็นชอบ อนุมัติเบิกจ่าย</EmptyChoice>
            <EmptyChoice>ไม่อนุมัติ {shortBlank}</EmptyChoice>
            <div className={styles.writingLine} />
          </>
        ) : (
          <>
            <div className={styles.writingLine} />
            <div className={styles.writingLine} />
          </>
        )}
      </div>
      <div className={styles.opinionSignature}>
        <p className={styles.signatureLine}>(ลงชื่อ)</p>
        <p>({person?.name.trim() || blank})</p>
        <p>{person?.position.trim() || `ตำแหน่ง ${shortBlank}`}</p>
      </div>
    </td>
  );
}

export function Section79Document({
  data,
  fontClassName,
}: {
  data: Section79Draft;
  fontClassName: string;
}) {
  const operation = data.kind === "purchase" ? "จัดซื้อ" : "จัดจ้าง";
  const receipt = data.receipt.kind === "receipt" ? "ใบเสร็จรับเงิน" : "ใบส่งของ";
  const amount = data.amount === null ? shortBlank : money(data.amount);
  const amountWords = data.amount === null ? `${shortBlank}บาทถ้วน` : toThaiBahtText(data.amount);

  return (
    <PaginatedDocument
      title="แบบฟอร์มคำขอซื้อ/จ้าง"
      formCode="ข้อ 79 วรรค 2"
      identifier={data.memoNumber}
      targetId="section79-print-document"
      fontClassName={fontClassName}
      pageClassName={styles.page}
      verifyCapture
      header={<div className={styles.runningHeader} aria-hidden="true" />}
      footer="คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี · เอกสารจัดทำเพื่อเสนอพิจารณา ไม่ใช่หลักฐานยืนยันการอนุมัติ"
    >
      <header className={styles.memoHeading}>
        <table role="presentation">
          <tbody>
            <tr>
              <td className={styles.emblemCell}>
                {/* Embed the verified local university emblem in the captured document. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/ubu-emblem.png"
                  width={56}
                  height={72}
                  alt="ตรามหาวิทยาลัยอุบลราชธานี"
                  data-pdf-required-content
                />
              </td>
              <td>
                <h1 data-pdf-required-content>บันทึกข้อความ</h1>
              </td>
              <td className={styles.scopeCell}>
                <div className={styles.scope} data-pdf-required-content>
                  แบบอนุมัติเบิกจ่าย โดยวิธีเฉพาะเจาะจง (ไม่เกิน 5 แสนบาท)
                  <br />
                  กรณีที่มีความจำเป็นเร่งด่วนที่เกิดขึ้นโดยไม่ได้คาดหมายไว้ก่อน
                  <br />
                  และไม่อาจดำเนินการตามปกติได้ทัน
                  <br />
                  ตาม พรบ มาตรา 56 (2) และระเบียบฯ ข้อ 79 วรรคสอง
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </header>
      <Prose indent={false}>
        ส่วนงาน {value(data.department)} โทร. {data.phone.trim() || shortBlank}
      </Prose>
      <div className={styles.memoIdentifiers}>
        <p>ที่ {value(data.memoNumber)}</p>
        <p>วันที่ {date(data.memoDate) || shortBlank}</p>
      </div>
      <Prose indent={false}>เรื่อง {value(data.subject)}</Prose>
      <p data-flow-text className={styles.addressee}>
        เรียน {value(data.addressee)}
      </p>
      <Prose>
        ด้วย ข้าพเจ้า {value(data.requester.name)} ตำแหน่ง {value(data.requester.position)}{" "}
        ได้ดำเนินการ{operation} {value(data.description)} จากร้าน {value(data.vendor)} ตาม (
        {receipt}) เล่มที่ {data.receipt.book.trim() || shortBlank} เลขที่{" "}
        {value(data.receipt.number)} ลงวันที่ {date(data.receipt.date) || shortBlank}{" "}
        โดยได้ดำเนินการจัดซื้อจัดจ้างไปก่อนเพราะไม่อาจดำเนินการจัดซื้อจัดจ้างตามปกติได้ทันและเป็นความจำเป็นเร่งด่วนที่เกิดขึ้นโดยไม่ได้คาดหมายไว้ก่อน
        เนื่องจาก {value(data.urgentReason)}
      </Prose>
      <p data-flow-text className={styles.conclusion}>
        จึงเรียนมาเพื่อโปรดพิจารณา
      </p>
      <Prose>
        1. ให้ความเห็นชอบการจัดซื้อจัดจ้างดังกล่าวข้างต้น
        และให้ถือรายงานนี้เป็นหลักฐานการตรวจรับพัสดุโดยอนุโลม
        ตามระเบียบกระทรวงการคลังว่าด้วยการจัดซื้อจัดจ้างและการบริหารพัสดุภาครัฐ พ.ศ. 2560 ข้อ 79
        วรรคสอง
      </Prose>
      <Prose>
        2. อนุมัติเบิกจ่ายเงิน จำนวน {amount} บาท ({amountWords}) เพื่อสั่งจ่ายให้แก่{" "}
        {value(data.payee)} โดยเบิกจ่ายจากงบประมาณรายจ่ายประจำปีงบประมาณ พ.ศ.{" "}
        {data.budget.fiscalYear || shortBlank} แหล่งเงิน {value(data.budget.source)} กองทุน{" "}
        {value(data.budget.fund)} กิจกรรม {value(data.budget.activity)} งาน/โครงการ{" "}
        {value(data.budget.project)}
      </Prose>
      <div className={styles.requesterSignature}>
        <p className={styles.requesterSignLine}>
          (ลงชื่อ)
          <span />
          เจ้าหน้าที่ผู้รับผิดชอบ
        </p>
        <p>({value(data.requester.name)})</p>
        <p>ตำแหน่ง {value(data.requester.position)}</p>
      </div>
      <table className={styles.opinions} data-page-break-before aria-label="ความเห็นและคำสั่ง">
        <colgroup>
          <col style={{ width: "50%" }} />
          <col style={{ width: "50%" }} />
        </colgroup>
        <tbody>
          {[0, 2, 4].map((index) => (
            <tr key={index}>
              <Opinion index={index} data={data} />
              <Opinion index={index + 1} data={data} />
            </tr>
          ))}
        </tbody>
      </table>
      <table className={styles.budgetCodes} aria-label="รหัสงบประมาณ">
        <colgroup>
          <col style={{ width: "20%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "20%" }} />
          <col style={{ width: "40%" }} />
        </colgroup>
        <tbody>
          <tr>
            <th>รหัสแหล่งเงิน</th>
            <td>{data.budget.sourceCode || shortBlank}</td>
            <th>รหัสหน่วยงาน</th>
            <td>{data.budget.departmentCode || shortBlank}</td>
          </tr>
          <tr>
            <th>รหัสกองทุน</th>
            <td>{data.budget.fundCode || shortBlank}</td>
            <th>รหัสกิจกรรม</th>
            <td>{data.budget.activityCode || shortBlank}</td>
          </tr>
        </tbody>
      </table>
    </PaginatedDocument>
  );
}
