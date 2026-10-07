"use client";

import { PaginatedDocument } from "@/app/components/print/paginated-document";
import { toThaiBahtText } from "@/app/payments/new/pol02";
import type { Pol01Person } from "../../pol01";
import type { Pol01PrintData } from "./pol01-print-data";
import styles from "@/app/components/print/document.module.css";

const money = (value: number) =>
  value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

function Signature({ label, person }: { label: string; person: Pol01Person }) {
  return (
    <div className={styles.signature}>
      <div className={styles.signLine}>
        <span>ลงชื่อ</span>
        <span className={styles.signSpace} />
        <span>{label}</span>
      </div>
      <div className={styles.personName}>
        ( {person.name || "................................................"} )
      </div>
      <div className={styles.position}>
        <span>ตำแหน่ง</span>
        <span className={styles.positionValue}>{person.position || "\u00a0"}</span>
      </div>
      <div className={styles.date}>
        <span>ว / ด / ป</span>
        <span className={styles.line} />
      </div>
    </div>
  );
}

export function Pol01Document({
  data,
  targetId,
  fontClassName,
}: {
  data: Pol01PrintData;
  targetId: string;
  fontClassName: string;
}) {
  return (
    <PaginatedDocument
      title="ใบขอซื้อ / เช่า / จ้างทั่วไป"
      formCode="POL - 01"
      identifier={`เลขที่คำขอ ${data.requestNo}`}
      footer={`คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี · ${data.requestNo}`}
      targetId={targetId}
      fontClassName={fontClassName}
    >
      <div className={styles.memo}>
        <div className={styles.field}>
          <strong className={styles.label}>ส่วนงาน</strong>
          <span className={styles.line}>สำนักงานคณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี</span>
        </div>
        <div className={styles.field}>
          <span>โทร</span>
          <span className={styles.line}>{data.phone}</span>
        </div>
        <div className={styles.field}>
          <strong className={styles.label}>ที่</strong>
          <span className={styles.line}>{data.documentNo || "อว 0604.19 /"}</span>
        </div>
        <div className={styles.field}>
          <strong>วันที่</strong>
          <span className={styles.line}>{data.createdDate}</span>
        </div>
        <div className={`${styles.field} ${styles.full}`}>
          <strong>เรื่อง</strong>
          <span className={styles.line}>{data.title}</span>
        </div>
        <div className={`${styles.field} ${styles.full}`}>
          <strong>เรียน</strong>
          <span className={styles.line}>{data.addressee}</span>
        </div>
      </div>
      <p className={styles.intro}>
        ด้วย งาน/สาขา {data.department || "................................"} คณะรัฐศาสตร์
        มีความประสงค์ให้งานพัสดุ สำนักงานเลขานุการ จัดซื้อ/จ้างพัสดุ เพื่อใช้
      </p>
      <p data-flow-text className={styles.purpose}>
        {data.rationale}
      </p>
      <div className={styles.category}>
        ในหมวด{" "}
        <span
          className={`${styles.check} ${data.expenseCategory === "ค่าใช้สอย" ? styles.checked : ""}`}
        />{" "}
        ค่าใช้สอย
        <span
          className={`${styles.check} ${data.expenseCategory === "ค่าวัสดุ" ? styles.checked : ""}`}
        />{" "}
        ค่าวัสดุ
        {!["ค่าใช้สอย", "ค่าวัสดุ"].includes(data.expenseCategory) && (
          <> · {data.expenseCategory}</>
        )}
        <br />
        ต้องการรับพัสดุในวันที่{" "}
        <strong>{data.requiredDate || "................................"}</strong>{" "}
        ตามรายการดังต่อไปนี้
      </div>
      <div className={styles.field}>
        <strong className={styles.label}>ผู้ประกอบการ/ร้านค้า</strong>
        <span className={styles.line}>{data.vendor || "ยังไม่ระบุผู้ประกอบการ/ร้านค้า"}</span>
      </div>
      <table className={styles.items} aria-label="รายการพัสดุ">
        <colgroup>
          {[7, 37, 9, 9, 13, 15, 10].map((width, index) => (
            <col key={index} style={{ width: `${width}%` }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {[
              "ลำดับ",
              "รายการ/ขนาด/ลักษณะ",
              "หน่วยนับ",
              "จำนวน",
              "ราคา/หน่วย",
              "ราคารวม",
              "หมายเหตุ",
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
              <td className={styles.center}>{item.lineNo}</td>
              <td>{item.description}</td>
              <td className={styles.center}>{item.unit}</td>
              <td className={styles.number}>{item.quantity.toLocaleString("th-TH")}</td>
              <td className={styles.number}>{money(item.unitPrice)}</td>
              <td className={styles.number}>{money(item.total)}</td>
              <td />
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 6 - data.items.length) }, (_, index) => (
            <tr key={`blank-${index}`} className={styles.emptyRow}>
              {Array.from({ length: 7 }, (_, cell) => (
                <td key={cell} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className={styles.total}>
        <span>รวม</span>
        <span>({toThaiBahtText(data.total)})</span>
        <span>
          <span className={styles.totalAmount}>{money(data.total)}</span> บาท
        </span>
      </div>
      <div className={styles.signatures}>
        <Signature label="ผู้ขอซื้อ/จ้าง" person={data.approval.requester} />
        <div>
          <h2 className={styles.committeeTitle}>
            พร้อมเสนอชื่อ คณะกรรมการ / ผู้ตรวจรับพัสดุ ดังนี้
          </h2>
          {data.approval.committee.map((member, index) => (
            <div key={index} className={styles.member}>
              <span>{index + 1}</span>
              <span className={styles.memberName}>{member.name}</span>
              <span>{member.role}</span>
            </div>
          ))}
        </div>
        <Signature label="เห็นชอบ" person={data.approval.endorser} />
        <Signature label="อนุมัติ" person={data.approval.approver} />
      </div>
      <section className={styles.budget}>
        <h2 className={styles.budgetTitle}>ระบุตัวเลขรหัสงบประมาณที่ได้รับจัดสรรจากกองแผนงาน</h2>
        <dl className={styles.budgetCodes}>
          {[
            ["รหัสแหล่งเงิน", data.budgetCodes.source],
            ["รหัสหน่วยงาน", data.budgetCodes.department],
            ["รหัสกองทุน", data.budgetCodes.fund],
            ["รหัสกิจกรรม", data.budgetCodes.activity],
          ].map(([label, value]) => (
            <div key={label} className={styles.budgetCode}>
              <dt>{label}</dt>
              <dd>{value || "................................"}</dd>
            </div>
          ))}
        </dl>
      </section>
      <div className={styles.details}>
        <p>
          ปีงบประมาณ {data.budgetYear} · แหล่งเงิน {data.fundSource} · แผนงาน {data.planName}
        </p>
        <p>
          <strong>เอกสารแนบ {data.attachments.length} ไฟล์</strong>
        </p>
      </div>
      {data.attachments.map((name, index) => (
        <p key={index} className={styles.attachment}>
          {index + 1}. {name}
        </p>
      ))}
    </PaginatedDocument>
  );
}
