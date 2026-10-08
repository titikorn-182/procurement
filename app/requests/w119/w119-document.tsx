"use client";

import { PaginatedDocument } from "@/app/components/print/paginated-document";
import { formatDocumentMoney as money } from "@/lib/pdf/format";
import type { W119PrintData } from "./w119-print-data";
import styles from "./w119-document.module.css";

/* W119 is the supplied official memorandum, not a new application identity.
 * Keep its emblem, ruled memo, six-column item ledger, (1)-(7) two-column panels
 * and six budget codes. TH SarabunPSK carries the dense A4 hierarchy.
 * Missing signatories remain blank; extra content flows to numbered pages. */
function Signature({
  role,
  name = "",
  position,
  roleBelow = false,
}: {
  role: string;
  name?: string;
  position?: string;
  roleBelow?: boolean;
}) {
  return (
    <div className={styles.signature}>
      <div className={styles.signLine}>
        <span>ลงชื่อ</span>
        <span className={styles.blank} />
        {!roleBelow && <span>{role}</span>}
      </div>
      <div className={styles.name}>
        ( {name || "................................................"} )
      </div>
      {roleBelow && <div className={styles.name}>{role}</div>}
      {position !== undefined && (
        <div className={styles.field}>
          <span>ตำแหน่ง</span>
          <span className={styles.line}>{position || "\u00a0"}</span>
        </div>
      )}
    </div>
  );
}

function ApprovalSpace() {
  return (
    <div className={styles.approvalSpace}>
      <div className={styles.blank} />
      <p>ปฏิบัติราชการแทนอธิการบดีมหาวิทยาลัยอุบลราชธานี</p>
    </div>
  );
}

function BudgetCode({ label, value }: { label: string; value: string }) {
  // Preserve the whole entered code, including leading zeros and unusually long legacy codes.
  const digits = Array.from(value || " ");
  return (
    <div className={styles.code}>
      <span className={styles.codeLabel}>{label}</span>
      <span className={styles.digits}>
        {digits.map((digit, index) => (
          <span key={index}>{digit === " " ? "\u00a0" : digit}</span>
        ))}
      </span>
    </div>
  );
}

export function W119Document({
  data,
  targetId,
  fontClassName,
}: {
  data: W119PrintData;
  targetId: string;
  fontClassName: string;
}) {
  const addressee = data.addressee || "................................................";
  return (
    <PaginatedDocument
      title="แบบฟอร์มขอซื้อขอจ้าง"
      formCode="ว119"
      identifier={data.requestNo || "ฉบับร่าง"}
      footer={`${data.requestNo || "ฉบับร่าง"} · แบบฟอร์มสำหรับลงนาม ไม่ใช่หลักฐานยืนยันการอนุมัติหรือการเบิกจ่าย`}
      targetId={targetId}
      fontClassName={fontClassName}
      pageClassName={styles.page}
      header={
        <header className={styles.heading}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/ubu-emblem.png" alt="ตรามหาวิทยาลัยอุบลราชธานี" width={56} height={72} />
          <div>
            <p className={styles.regulation}>
              แบบฟอร์มขอซื้อขอจ้าง ตามหนังสือ ด่วนที่สุด ที่ กค (กวจ) 0405.2/ว119 ลงวันที่ 7 มีนาคม
              2561
            </p>
            <h1>บันทึกข้อความ</h1>
          </div>
        </header>
      }
    >
      <div className={styles.memo}>
        <div className={styles.department}>
          <strong>ส่วนงาน</strong>
          <span className={styles.line}>{data.department}</span>
          <strong>โทร.</strong>
          <span className={styles.line}>{data.phone}</span>
        </div>
        <div className={styles.memoRow}>
          <div className={styles.field}>
            <strong>ที่</strong>
            <span className={styles.line}>{data.documentNo}</span>
          </div>
          <div className={styles.field}>
            <strong>วันที่</strong>
            <span className={styles.line}>{data.memoDate}</span>
          </div>
        </div>
      </div>
      <p data-flow-text className={styles.subject}>
        เรื่อง {data.title || "ขอซื้อ/จ้าง พัสดุ"}
      </p>
      <p className={styles.addressee}>
        <strong>(1) เรียน</strong> {addressee}
      </p>
      <p data-flow-text className={styles.purpose}>
        มีความประสงค์ให้งานพัสดุจัดหาพัสดุเพื่อ{" "}
        {data.rationale ||
          "................................................................................................"}
      </p>
      <p className={styles.required}>
        ต้องใช้พัสดุ/งานแล้วเสร็จภายในวันที่{" "}
        <span>{data.requiredDate || "................................"}</span>{" "}
        ตามรายละเอียดดังต่อไปนี้
      </p>
      <table className={styles.items}>
        <colgroup>
          <col style={{ width: "6%" }} />
          <col style={{ width: "45%" }} />
          <col style={{ width: "10%" }} />
          <col style={{ width: "9%" }} />
          <col style={{ width: "14%" }} />
          <col style={{ width: "16%" }} />
        </colgroup>
        <thead>
          <tr>
            {["ลำดับ", "รายการ/ขนาด/ลักษณะ", "หน่วยนับ", "จำนวน", "ราคา/หน่วย", "ราคารวม"].map(
              (label) => (
                <th key={label}>{label}</th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {data.items.map((item, index) => (
            <tr key={index}>
              <td className={styles.center}>{item.lineNo}</td>
              <td>{item.description}</td>
              <td className={styles.center}>{item.unit}</td>
              <td className={styles.number}>{item.quantity.toLocaleString("th-TH")}</td>
              <td className={styles.number}>{money(item.unitPrice)}</td>
              <td className={styles.number}>{money(item.total)}</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 3 - data.items.length) }, (_, index) => (
            <tr key={`blank-${index}`} className={styles.emptyRow}>
              <td />
              <td />
              <td />
              <td />
              <td />
              <td />
            </tr>
          ))}
          <tr>
            <td colSpan={5} className={styles.totalLabel}>
              รวมทั้งสิ้น
            </td>
            <td className={styles.total}>{money(data.total)}</td>
          </tr>
        </tbody>
      </table>
      <div className={styles.requestSignatures}>
        <Signature
          role="ผู้ขอซื้อ/ขอจ้าง"
          name={data.requesterName}
          position={data.requesterPosition}
        />
        <Signature role="รองคณบดี/หน.สนง" position="" />
      </div>
      <div className={styles.workflow}>
        <div className={styles.column}>
          <section className={styles.primaryPanel}>
            <h2>(2) เรื่อง ขออนุมัติยืมเงินทดรองราชการ (กรณียืมเงิน)</h2>
            <p>
              <strong>เรียน</strong> {addressee}
            </p>
            {data.advanceRequired ? (
              <p className={styles.prose}>
                เพื่อโปรดพิจารณาอนุมัติยืมเงินทดรองราชการเพื่อดำเนินการจัดซื้อจัดจ้าง
                ทั้งนี้ตามหนังสือ ด่วนที่สุด ที่ กค (กวจ) 0405.2/ว119 ลว. 7 มี.ค. 2561
                ได้รับยกเว้นไม่ต้องจัดทำรายงานขอซื้อหรือจ้างตามระเบียบฯ การจัดซื้อจัดจ้าง พ.ศ. 2560
                ข้อ 22
              </p>
            ) : (
              <p className={styles.notApplicable}>ไม่ประสงค์ยืมเงินทดรองราชการ</p>
            )}
            <div className={styles.dualSign}>
              <Signature role="เจ้าหน้าที่" roleBelow />
              <Signature role="หัวหน้าเจ้าหน้าที่" roleBelow />
            </div>
          </section>
          <section className={styles.approvalPanel}>
            <h2>(3) เห็นชอบให้ดำเนินการตามเสนอ</h2>
            <ApprovalSpace />
          </section>
          <section className={styles.reportPanel}>
            <h2>
              (4) เรื่อง รายงานขอความเห็นชอบการจัดซื้อจัดจ้างตามหนังสือ ด่วนที่สุด ที่ กค (กวจ)
              0405.2/ว119 ลว. 7 มี.ค. 2561
            </h2>
            <p>
              <strong>เรียน</strong> {addressee}
            </p>
            <p className={styles.prose}>
              ได้ดำเนินการจัดซื้อจัดจ้างเสร็จเรียบร้อยตามหลักฐานการจัดซื้อจัดจ้างที่แนบมาพร้อมนี้
            </p>
            <Signature role="เจ้าหน้าที่" />
          </section>
        </div>
        <div className={styles.column}>
          <section className={styles.primaryPanel}>
            <h2>(5) เรื่อง เห็นชอบรายงานการจัดซื้อจัดจ้าง และอนุมัติเบิกจ่ายเงินค่าพัสดุ</h2>
            <p>
              <strong>เรียน</strong> {addressee}
            </p>
            <p className={styles.prose}>
              ตรวจสอบแล้วการดำเนินการถูกต้องตามหนังสือ ด่วนที่สุด ที่ กค (กวจ) 0405.2/ว119 ลว. 7
              มี.ค. 2561 เห็นควรเบิกจ่ายเงินจำนวน ................................ บาท
              เพื่อชำระแก่เจ้าหนี้ต่อไป
            </p>
            <p className={styles.prose}>
              หากเห็นชอบให้ถือว่ารายงานนี้เป็นหลักฐานในการตรวจรับโดยอนุโลม
              ทั้งนี้ได้ประกาศผู้ชนะการจัดซื้อจัดจ้างรายไตรมาสแล้ว
            </p>
            <p className={styles.prose}>จึงเรียนมาเพื่อโปรดทราบและพิจารณา</p>
            <Signature role="หัวหน้าเจ้าหน้าที่" />
          </section>
          <section className={styles.financePanel}>
            <h2>(6) เรียน {addressee}</h2>
            <p className={styles.prose}>
              ได้ตรวจหลักฐานขอเบิกถูกต้อง ตามระเบียบฯ แล้ว เห็นควรเบิกจ่ายเงินให้กับเจ้าหนี้ต่อไป
            </p>
            <p>ขออนุมัติเบิกจ่ายลำดับที่ ................................</p>
            <Signature role="เจ้าหน้าที่การเงิน" />
          </section>
          <section className={styles.finalPanel}>
            <h2>(7) เห็นชอบรายงานการจัดซื้อจัดจ้าง และอนุมัติเบิกจ่ายเงินตามเสนอ</h2>
            <ApprovalSpace />
          </section>
        </div>
      </div>
      <div className={styles.budget}>
        <div>
          <BudgetCode label="รหัสแหล่งเงิน" value={data.budgetCodes.source} />
          <BudgetCode label="รหัสกองทุน" value={data.budgetCodes.fund} />
          <BudgetCode label="รหัสโครงการย่อย" value={data.budgetCodes.subproject} />
        </div>
        <div>
          <BudgetCode label="รหัสหน่วยงาน" value={data.budgetCodes.department} />
          <BudgetCode label="รหัสแผนงาน" value={data.budgetCodes.plan} />
          <BudgetCode label="รหัสกิจกรรม" value={data.budgetCodes.activity} />
        </div>
      </div>
    </PaginatedDocument>
  );
}
