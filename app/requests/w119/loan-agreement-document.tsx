"use client";

import { PaginatedDocument } from "@/app/components/print/paginated-document";
import { toThaiBahtText } from "@/app/payments/new/pol02";
import { formatDocumentMoney as money, formatThaiDocumentDate as date } from "@/lib/pdf/format";
import { loanDueDate, type LoanAgreement } from "./loan-agreement";
import type { W119PrintData } from "./w119-print-data";
import styles from "./loan-agreement-document.module.css";

const blank = "................................................";
const show = (value: string) => value || blank;
const dateBlank = "วันที่ ............ / ........................ / ............";

/** Source: supplied POL-2569. Blank approvals and receipts are for actual execution. */
export function LoanAgreementDocument({
  loan,
  data,
  targetId,
  fontClassName,
}: {
  loan: LoanAgreement;
  data: W119PrintData;
  targetId: string;
  fontClassName: string;
}) {
  const total = data.items.reduce((sum, item) => sum + Math.round(item.total * 100), 0) / 100;
  return (
    <PaginatedDocument
      title="สัญญาการยืมเงิน"
      formCode="POL-2569"
      identifier={data.requestNo || "ฉบับร่าง"}
      targetId={targetId}
      fontClassName={fontClassName}
      pageClassName={styles.page}
      verifyCapture
      footer={
        (data.requestNo || "ฉบับร่าง") + " · แบบฟอร์มสำหรับลงนาม ยังไม่ใช่หลักฐานอนุมัติหรือรับเงิน"
      }
      header={
        <header className={styles.heading} data-pdf-required-content>
          <div className={styles.headingMain}>
            <h1>สัญญาการยืมเงิน</h1>
            <p>เรียน อธิการบดี</p>
          </div>
          <div className={styles.registration}>
            <p>เลขที่ รศ. {show(loan.contractNo)}</p>
            <div className={styles.due}>
              <span>วันครบกำหนด</span>
              <strong>{show(date(loanDueDate(loan.endDate)))}</strong>
            </div>
          </div>
        </header>
      }
    >
      <div className={styles.identity}>
        <div className={styles.identityRow}>
          <span>ข้าพเจ้า</span>
          <strong>{show(loan.borrowerName)}</strong>
          <span>ตำแหน่ง</span>
          <strong className={styles.line}>{show(loan.borrowerPosition)}</strong>
        </div>
        <div className={styles.affiliation}>
          <span>สังกัด</span>
          <span>{show(loan.affiliation)}</span>
        </div>
        <p>
          มีความประสงค์ขอยืมเงินจาก{" "}
          <span className={styles.indent}>เงินทดรองจ่ายจากเงินรายได้</span>
          <span className={styles.faculty}>คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี</span>
        </p>
        <div className={styles.project}>
          <span>เพื่อเป็นค่าใช้จ่ายรายละเอียดต่อไปนี้</span>
          <span>( {loan.projectType === "project" ? "✓" : " "} ) โครงการ</span>
          <span>( {loan.projectType === "activity" ? "✓" : " "} ) กิจกรรม</span>
          <span className={styles.line}>{show(loan.projectName)}</span>
        </div>
      </div>
      <p data-flow-text className={styles.details}>
        {show(loan.purpose)}
      </p>
      <p className={styles.endDate}>
        <strong>วันสิ้นสุดโครงการ/กิจกรรม</strong>{" "}
        <span className={styles.indent}>{show(date(loan.endDate))}</span>
      </p>
      <table className={styles.expenses} aria-label="รายการค่าใช้จ่ายในสัญญายืมเงิน">
        <colgroup>
          <col style={{ width: "4%" }} />
          <col style={{ width: "82%" }} />
          <col style={{ width: "14%" }} />
        </colgroup>
        <tbody>
          {data.items.map((item, index) => (
            <tr key={index}>
              <td className={styles.center}>{index + 1}</td>
              <td>{item.description}</td>
              <td className={styles.number}>{money(item.total)}</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 5 - data.items.length) }, (_, index) => (
            <tr key={"blank-" + index}>
              <td className={styles.center}>{data.items.length + index + 1}</td>
              <td>&nbsp;</td>
              <td className={styles.number} />
            </tr>
          ))}
          <tr>
            <td colSpan={2} className={styles.transfer}>
              <div>
                <span>หมายเหตุ :</span>
                <div>
                  <p>
                    1. โอนเข้าบัญชี {show(loan.accountName)} เลขที่บัญชี{" "}
                    <span className={styles.line}>{show(loan.accountNumber)}</span> ธนาคาร{" "}
                    <span className={styles.line}>{show(loan.bankName)}</span>
                  </p>
                  <p>
                    2. โปรดโอนเงินภายในวันที่{" "}
                    <span className={styles.line}>{show(date(loan.transferDate))}</span> เพื่อ{" "}
                    <span className={styles.line}>{show(loan.transferPurpose)}</span>
                  </p>
                </div>
              </div>
            </td>
            <td className={styles.number} />
          </tr>
          <tr className={styles.total}>
            <td colSpan={2}>
              <span>({toThaiBahtText(total)})</span>
              <strong>รวมเงิน (บาท)</strong>
            </td>
            <td className={styles.number}>{money(total)}</td>
          </tr>
        </tbody>
      </table>
      <div className={styles.declaration}>
        <p>
          ข้าพเจ้าสัญญาว่าจะปฏิบัติตามประกาศมหาวิทยาลัยอุบลราชธานี ว่าด้วยเงินทดรองจ่ายจากเงินรายได้
          พ.ศ. 2569 ทุกประการ และจะนำหลักฐานการจ่ายที่ถูกต้อง พร้อมทั้งเงินเหลือจ่าย (ถ้ามี)
          ส่งใช้คืนภายในระยะเวลาที่ประกาศกำหนด คือ 15 วัน นับถัดจากวันสิ้นสุดโครงการหรือกิจกรรม
          หากข้าพเจ้าไม่ส่งใช้คืนตามกำหนด ข้าพเจ้ายินยอมให้มหาวิทยาลัยหักเงินเดือน เงินค่าจ้าง
          เงินประจำตำแหน่ง เงินค่าตอบแทน เงินบำเหน็จ เงินบำนาญ
          เบี้ยหวัดหรือเงินอื่นใดที่ข้าพเจ้ามีสิทธิได้รับจากมหาวิทยาลัย เพื่อชดใช้เงินยืม
          ตามสัญญานี้จนกว่าจะครบถ้วน
        </p>
        <div className={styles.borrowerSignature}>
          <p>ลายมือชื่อ {blank} ผู้ยืม</p>
          <p>( {show(loan.borrowerName)} )</p>
          <p>{dateBlank}</p>
        </div>
      </div>
      <div className={styles.approvals}>
        {[
          [
            "1) เรียน อธิการบดี",
            "ได้ตรวจสอบแล้ว เห็นสมควรอนุมัติให้ยืมตามสัญญายืมฉบับนี้ได้",
            "นักวิชาการเงินและบัญชีชำนาญการ",
            "",
          ],
          [
            "2) เรียน อธิการบดี",
            "เห็นควรอนุมัติให้ยืมตามสัญญายืมฉบับนี้ได้",
            "เจ้าหน้าที่บริหารงานทั่วไปชำนาญการพิเศษ",
            "หัวหน้าสำนักงานเลขานุการคณะรัฐศาสตร์",
          ],
          [
            "3) เรียน อธิการบดี",
            "ได้ตรวจสอบแล้ว เห็นสมควรอนุมัติให้ยืมตามสัญญายืมฉบับนี้ได้",
            "รองคณบดีฝ่ายบริหารและพัฒนาองค์การ",
            "",
          ],
          [
            "4) คำอนุมัติ",
            "อนุมัติให้ยืมตามเงื่อนไขข้างต้นได้",
            "คณบดีคณะรัฐศาสตร์",
            "ปฏิบัติการแทนอธิการบดีมหาวิทยาลัยอุบลราชธานี",
          ],
        ].map(([heading, text, role, secondRole]) => (
          <section key={heading}>
            <h2>{heading}</h2>
            <p>{text} จำนวนเงิน ........................ บาท</p>
            <p>
              (................................................................................)
            </p>
            <div className={styles.approvalSignature}>
              <div className={styles.signSpace} />
              <p>( {blank} )</p>
              <p>{role}</p>
              {secondRole && <p>{secondRole}</p>}
              <p>{dateBlank}</p>
            </div>
          </section>
        ))}
      </div>
      <section className={styles.receipt}>
        <h2>ใบรับเงิน</h2>
        <p>
          ได้รับเงินยืมจำนวน ........................ บาท
          (................................................................) ไปเป็นการถูกต้องแล้ว
        </p>
        <div className={styles.receiptSignature}>
          <div>
            <p>ลงชื่อ {blank} ผู้รับเงิน</p>
            <p className={styles.center}>( {blank} )</p>
          </div>
          <p>{dateBlank}</p>
        </div>
      </section>
      <table className={styles.repayments} aria-label="รายการส่งใช้เงินยืม">
        <colgroup>
          {[9.5, 20, 13, 10.5, 15, 14, 18].map((width, index) => (
            <col key={index} style={{ width: width + "%" }} />
          ))}
        </colgroup>
        <thead>
          {/* Keep the title inside the grid: PDF capture freezes computed table height,
              which includes captions and would otherwise count their height twice. */}
          <tr>
            <th colSpan={7} className={styles.repaymentTitle}>
              รายการส่งใช้เงินยืม
            </th>
          </tr>
          <tr>
            <th rowSpan={2}>ครั้งที่</th>
            <th rowSpan={2}>วัน เดือน ปี</th>
            <th colSpan={2}>รายการส่งใช้</th>
            <th rowSpan={2}>คงค้าง</th>
            <th rowSpan={2}>ลายมือผู้รับ</th>
            <th rowSpan={2}>ใบรับเลขที่</th>
          </tr>
          <tr>
            <th>เงินสด/เงินโอน/ใบสำคัญ</th>
            <th>จำนวนเงิน</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            {Array.from({ length: 7 }, (_, index) => (
              <td key={index}>&nbsp;</td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className={styles.note}>
        หมายเหตุ: การส่งใช้เงินยืมทดรองจ่ายเพื่อหมุนเวียน ให้ส่งใช้ภายใน 15
        วันนับถัดจากวันสิ้นสุดโครงการหรือกิจกรรม ข้อ 22 ตามประกาศมหาวิทยาลัยอุบลราชธานี เรื่อง
        เงินทดรองจ่ายจากเงินรายได้ พ.ศ. 2569
      </p>
    </PaginatedDocument>
  );
}
