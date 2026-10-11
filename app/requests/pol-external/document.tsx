import { PaginatedDocument } from "@/app/components/print/paginated-document";
import shared from "@/app/components/print/document.module.css";
import styles from "./document.module.css";
import { formatThaiDocumentDate, formatDocumentMoney as money } from "@/lib/pdf/format";
import { toThaiBahtText } from "@/app/payments/new/pol02";
import { toPol01PrintData, type Pol01PrintData } from "../[id]/print/pol01-print-data";
import { readExternalPol01, type ExternalPol01 } from "./schema";
import { externalMetadata, externalTotal, externalItemTotal, type ExternalDraft } from "./model";

export type ExternalPrintData = { base: Pol01PrintData; metadata: ExternalPol01 };
export function toExternalPrintData(record: Record<string, unknown>): ExternalPrintData | null {
  const form = record.form_data as { externalPol01?: unknown } | null;
  const metadata = readExternalPol01(form?.externalPol01);
  return metadata ? { base: toPol01PrintData(record), metadata } : null;
}
export function externalPreviewData(data: ExternalDraft): ExternalPrintData {
  return {
    metadata: externalMetadata(data),
    base: toPol01PrintData({
      title: data.title,
      rationale: data.rationale,
      required_date: data.requiredDate,
      expense_category: data.expenseCategory,
      estimated_amount: externalTotal(data),
      form_data: { budgetCodes: data.budgetCodes },
      request_items: data.items.map((item, index) => ({
        line_no: index + 1,
        description: item.description,
        unit: item.unit,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_amount: externalItemTotal(item),
      })),
    }),
  };
}

export function ExternalDocument({
  data,
  targetId,
  fontClassName,
}: {
  data: ExternalPrintData;
  targetId: string;
  fontClassName: string;
}) {
  const { base, metadata } = data;
  return (
    <PaginatedDocument
      title="โครงการบริการวิชาการจากแหล่งทุนภายนอก"
      formCode="POL - 01"
      identifier={base.requestNo}
      footer={base.requestNo ? `POL- ภายนอก · ${base.requestNo}` : "ฉบับร่าง · ยังไม่ได้ส่งคำขอ"}
      targetId={targetId}
      fontClassName={fontClassName}
      verifyCapture
      header={
        <header className={styles.heading}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/ubu-emblem.png"
            width={56}
            height={72}
            alt="ตรามหาวิทยาลัยอุบลราชธานี"
            data-pdf-required-content=""
          />
          <div data-pdf-required-content="">
            <h1>โครงการบริการวิชาการจากแหล่งทุนภายนอก</h1>
            <h2>ใบขอซื้อ / เช่า / จ้างทั่วไป</h2>
          </div>
          <span className={styles.code} data-pdf-required-content="">
            พัสดุ POL - 01
          </span>
        </header>
      }
    >
      <div className={styles.memo}>
        <div className={shared.field}>
          <strong>ส่วนราชการ</strong>
          <span className={shared.line}>{metadata.departmentName}</span>
        </div>
        <div className={shared.field}>
          <span>โทร</span>
          <span className={shared.line}>{metadata.phone}</span>
        </div>
      </div>
      <div className={shared.memo}>
        <div className={shared.field}>
          <strong>ที่</strong>
          <span className={shared.line}>{metadata.documentNo}</span>
        </div>
        <div className={shared.field}>
          <strong>วันที่</strong>
          <span className={shared.line}>{formatThaiDocumentDate(metadata.memoDate)}</span>
        </div>
      </div>
      <p data-flow-text className={styles.text}>
        <strong>เรื่อง</strong> {base.title}
      </p>
      <p data-flow-text className={styles.text}>
        <strong>เรียน</strong> {metadata.addressee}
      </p>
      <p data-flow-text className={`${styles.text} ${styles.indent}`}>
        ด้วย งาน/สาขา {metadata.workUnit} คณะรัฐศาสตร์ มีความประสงค์ให้ {metadata.procurementUnit}{" "}
        จัดซื้อ/เช่า/จ้างพัสดุ เพื่อใช้ {base.rationale}
      </p>
      <p className={styles.text}>
        ในหมวด ({base.expenseCategory === "ค่าใช้สอย" ? " / " : "   "}) ค่าใช้สอย (
        {base.expenseCategory === "ค่าวัสดุ" ? " / " : "   "}) ค่าวัสดุ
        <br />
        ต้องการรับพัสดุในวันที่ {base.requiredDate} ตามรายการดังต่อไปนี้
      </p>
      <table className={shared.items} aria-label="รายการพัสดุ POL- ภายนอก">
        <colgroup>
          {[6, 37, 9, 8, 12, 14, 14].map((width, index) => (
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
          {base.items.map((item) => (
            <tr key={item.lineNo}>
              <td className={shared.center}>{item.lineNo}</td>
              <td>{item.description}</td>
              <td className={shared.center}>{item.unit}</td>
              <td className={shared.number}>{item.quantity || ""}</td>
              <td className={shared.number}>{money(item.unitPrice)}</td>
              <td className={shared.number}>{money(item.total)}</td>
              <td>{metadata.itemNotes.find((note) => note.lineNo === item.lineNo)?.note}</td>
            </tr>
          ))}
          {metadata.torNote && (
            <tr>
              <td />
              <td colSpan={6}>{metadata.torNote}</td>
            </tr>
          )}
          {Array.from(
            { length: Math.max(0, 6 - base.items.length - (metadata.torNote ? 1 : 0)) },
            (_, index) => (
              <tr key={`empty-${index}`} className={shared.emptyRow}>
                {Array.from({ length: 7 }, (_, cell) => (
                  <td key={cell} />
                ))}
              </tr>
            ),
          )}
        </tbody>
      </table>
      <div className={shared.total}>
        <span>รวม</span>
        <span>({toThaiBahtText(base.total)})</span>
        <span className={shared.totalAmount}>{money(base.total)} บาท</span>
      </div>
      <section className={shared.budget}>
        <h2 className={shared.budgetTitle}>ระบุตัวเลขรหัสงบประมาณที่ได้รับจัดสรรจากกองแผนงาน</h2>
        <dl className={shared.budgetCodes}>
          {[
            ["รหัสแหล่งเงิน", base.budgetCodes.source],
            ["รหัสหน่วยงาน", base.budgetCodes.department],
            ["รหัสกองทุน", base.budgetCodes.fund],
            ["รหัสกิจกรรม", base.budgetCodes.activity],
          ].map(([label, value]) => (
            <div key={label} className={shared.budgetCode}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </PaginatedDocument>
  );
}
