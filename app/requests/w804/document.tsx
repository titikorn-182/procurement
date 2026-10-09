"use client";

import type { ReactNode } from "react";
import { PaginatedDocument } from "@/app/components/print/paginated-document";
import { formatDocumentMoney as money, formatThaiDocumentDate as date } from "@/lib/pdf/format";
import { toThaiBahtText } from "@/app/payments/new/pol02";
import { W804_CIRCULAR, W804_DOCUMENTS, W804_FACULTY, type W804DocumentKind } from "./config";
import { itemTotal, totals, type W804Draft } from "./model";
import styles from "./document.module.css";

const blank = "........................................";
function Prose({ children }: { children: ReactNode }) {
  return (
    <p data-flow-text className={styles.prose}>
      {children}
    </p>
  );
}
function Heading({ children }: { children: ReactNode }) {
  return <h2 className={styles.section}>{children}</h2>;
}
function Person({ person, label }: { person: W804Draft["preparer"]; label?: string }) {
  return (
    <div className={styles.signature}>
      <p className={styles.signatureLine}>ลงชื่อ</p>
      <p>({person.name || blank})</p>
      <p>{person.position || `ตำแหน่ง ${blank}`}</p>
      {label && <p>{label}</p>}
      <p>วันที่ ........ / ........ / ........</p>
    </div>
  );
}
function Signatures({ data }: { data: W804Draft }) {
  return (
    <div className={styles.signatures}>
      <div>
        <p className={styles.section}>ผู้จัดทำ/ผู้รับผิดชอบ</p>
        <Person person={data.preparer} />
      </div>
      {data.reviewers.map((person, index) => (
        <div className={styles.opinion} key={index}>
          <p className={styles.section}>
            {index === 0 ? "ความเห็นผู้ตรวจสอบ" : "ความเห็น/คำสั่งผู้พิจารณา"}
          </p>
          <div className={styles.blank} />
          <Person person={person} />
        </div>
      ))}
    </div>
  );
}
function ItemTable({
  data,
  specifications = false,
}: {
  data: W804Draft;
  specifications?: boolean;
}) {
  return (
    <table className={styles.table}>
      <colgroup>
        <col style={{ width: "7%" }} />
        <col style={{ width: "41%" }} />
        <col style={{ width: "10%" }} />
        <col style={{ width: "10%" }} />
        <col style={{ width: "15%" }} />
        <col style={{ width: "17%" }} />
      </colgroup>
      <thead>
        <tr>
          {[
            "ลำดับ",
            specifications ? "รายการ/คุณลักษณะเฉพาะ" : "รายการ",
            "จำนวน",
            "หน่วย",
            "ราคา/หน่วย (บาท)",
            "จำนวนเงิน (บาท)",
          ].map((label) => (
            <th key={label}>{label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.items.map((item, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td>
              {item.description}
              {specifications && item.specification ? `\n${item.specification}` : ""}
            </td>
            <td className={styles.number}>{item.quantity}</td>
            <td>{item.unit}</td>
            <td className={styles.number}>{money(item.unitPrice)}</td>
            <td className={styles.number}>{money(itemTotal(item))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
function Budget({ data }: { data: W804Draft }) {
  const labels: [keyof W804Draft["budget"], string][] = [
    ["fiscalYear", "ปีงบประมาณ พ.ศ."],
    ["source", "แหล่งเงิน"],
    ["plan", "แผนงาน"],
    ["category", "หมวดรายจ่าย"],
    ["sourceCode", "รหัสแหล่งเงิน"],
    ["departmentCode", "รหัสหน่วยงาน"],
    ["fundCode", "รหัสกองทุน"],
    ["activityCode", "รหัสกิจกรรม"],
  ];
  const entries = labels.filter(([key]) => data.budget[key]);
  return (
    <table className={styles.table}>
      <colgroup>
        <col style={{ width: "23%" }} />
        <col style={{ width: "27%" }} />
        <col style={{ width: "23%" }} />
        <col style={{ width: "27%" }} />
      </colgroup>
      <tbody>
        {Array.from({ length: Math.ceil(entries.length / 2) }, (_, i) => {
          const first = entries[i * 2];
          const second = entries[i * 2 + 1];
          return (
            <tr key={first[0]}>
              <td>{first[1]}</td>
              <td>{data.budget[first[0]]}</td>
              <td>{second?.[1] ?? ""}</td>
              <td>{second ? data.budget[second[0]] : ""}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
function Receipts({ data }: { data: W804Draft }) {
  return (
    <table className={styles.table}>
      <colgroup>
        <col style={{ width: "6%" }} />
        <col style={{ width: "16%" }} />
        <col style={{ width: "19%" }} />
        <col style={{ width: "16%" }} />
        <col style={{ width: "27%" }} />
        <col style={{ width: "16%" }} />
      </colgroup>
      <thead>
        <tr>
          {[
            "ที่",
            "วันที่ซื้อ",
            "ร้านค้า",
            "เลขที่หลักฐาน",
            "รายการ/จำนวน/หน่วย",
            "จำนวนเงิน (บาท)",
          ].map((label) => (
            <th key={label}>{label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {data.receipts.map((row, i) => (
          <tr key={i}>
            <td>{i + 1}</td>
            <td>{date(row.date)}</td>
            <td>{row.vendor}</td>
            <td>{row.number}</td>
            <td>
              {row.description}
              {"\n"}
              {row.quantity}
            </td>
            <td className={styles.number}>{money(row.amount)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Supplied memo/TOR topology, faculty identity, blank decisions; no workflow claims. */
export function W804Document({
  data,
  kind,
  fontClassName,
}: {
  data: W804Draft;
  kind: W804DocumentKind;
  fontClassName: string;
}) {
  const { requested, spent, budgetBalance, loanBalance } = totals(data);
  const label = W804_DOCUMENTS.find((entry) => entry.id === kind)!.label;
  const subject = `${kind === "purchase" ? "รายงานขอซื้อ" : label} ${data.title}`;
  return (
    <PaginatedDocument
      title={label}
      formCode="ว804"
      identifier="ฉบับจัดทำเอกสาร"
      targetId="w804-print-document"
      fontClassName={fontClassName}
      pageClassName={styles.page}
      verifyCapture
      footer="แบบฟอร์มสำหรับเสนอพิจารณา · ไม่ใช่หลักฐานยืนยันการอนุมัติหรือรับคืนเงิน"
      header={
        <div className={styles.heading}>
          <table role="presentation">
            <tbody>
              <tr>
                <td>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    data-pdf-required-content
                    src="/ubu-emblem.png"
                    width={40}
                    height={52}
                    alt="ตรามหาวิทยาลัยอุบลราชธานี"
                  />
                </td>
                <td>
                  <strong data-pdf-required-content>{W804_FACULTY}</strong>
                </td>
                <td data-pdf-required-content>
                  จัดซื้อ ว804
                  <br />
                  ไม่เกิน 50,000 บาท
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      }
    >
      <h1 className={styles.title}>บันทึกข้อความ</h1>
      <div className={styles.memo}>
        <p className={styles.wide}>
          <strong>ส่วนราชการ </strong>
          {data.department} {W804_FACULTY}
          {data.phone ? ` โทร. ${data.phone}` : ""}
        </p>
        <p>
          <strong>ที่ </strong>
          {data[kind].number || blank}
        </p>
        <p>
          <strong>วันที่ </strong>
          {date(data[kind].date)}
        </p>
        <p className={styles.wide}>
          <strong>เรื่อง </strong>
          {subject}
        </p>
      </div>
      <Prose>เรียน {data.addressee}</Prose>
      <Prose>
        อ้างถึง หนังสือด่วนที่สุด ที่ {W804_CIRCULAR} เรื่อง
        แนวทางปฏิบัติสำหรับการจัดซื้อวงเงินไม่เกิน 50,000 บาท
      </Prose>
      {kind === "purchase" ? (
        <>
          <Prose>{data.rationale}</Prose>
          <Heading>1. รายละเอียดพัสดุที่จะซื้อและประมาณการราคา</Heading>
          <Prose>ขอจัดซื้อ {data.title} ตามรายการและรายละเอียดคุณลักษณะเฉพาะ (TOR) แนบท้าย</Prose>
          <ItemTable data={data} />
          <p className={styles.total}>
            รวมเป็นเงิน {money(requested)} บาท ({toThaiBahtText(requested)})
          </p>
          <Heading>2. งบประมาณ</Heading>
          <Prose>
            วงเงินที่ประมาณว่าจะซื้อ {money(requested)} บาท รวมภาษี ค่าขนส่ง
            และค่าใช้จ่ายทั้งหมดแล้ว
          </Prose>
          <Budget data={data} />
          <Heading>3. ราคากลาง</Heading>
          <Prose>
            วงเงินประมาณการที่ใช้เป็นราคากลาง {money(requested)} บาท ({toThaiBahtText(requested)})
          </Prose>
          {data.priceSource && <Prose>{data.priceSource}</Prose>}
        </>
      ) : (
        <>
          <Prose>
            ตามรายงานขอซื้อเลขที่ {data.approvalNumber} ซึ่งได้รับความเห็นชอบเมื่อวันที่{" "}
            {date(data.approvalDate)} สำหรับ {data.title} วงเงิน {money(data.approvedAmount)} บาท (
            {toThaiBahtText(data.approvedAmount)}) จึงขอเสนอรายละเอียดผลการจัดซื้อและหลักฐานการจ่าย
            ดังนี้
          </Prose>
          <Heading>1. ผลการจัดซื้อ</Heading>
          <Receipts data={data} />
          <p className={styles.total}>
            ยอดซื้อจริงรวม {money(spent)} บาท ({toThaiBahtText(spent)})
          </p>
          {data.inspection && <Prose>ผลการตรวจสอบและรับมอบพัสดุ: {data.inspection}</Prose>}
          <Heading>2. สรุปการใช้เงิน</Heading>
          <table className={styles.table}>
            <colgroup>
              <col style={{ width: "70%" }} />
              <col />
            </colgroup>
            <tbody>
              <tr>
                <td>วงเงินที่ได้รับความเห็นชอบ</td>
                <td className={styles.number}>{money(data.approvedAmount)} บาท</td>
              </tr>
              {kind === "settlement" && (
                <tr>
                  <td>
                    เงินยืมตามสัญญาเลขที่ {data.loanNumber}
                    <br />
                    ลงวันที่ {date(data.loanDate)}
                  </td>
                  <td className={styles.number}>{money(data.loanAmount)} บาท</td>
                </tr>
              )}
              <tr>
                <td>ค่าใช้จ่ายตามหลักฐานการจ่าย</td>
                <td className={styles.number}>{money(spent)} บาท</td>
              </tr>
              <tr>
                <td>
                  {kind === "settlement"
                    ? "เงินคงเหลือที่ขอส่งคืน"
                    : "วงเงินที่ยังไม่ใช้ (ไม่ใช่ยอดเงินสดส่งคืน)"}
                </td>
                <td className={styles.number}>
                  {money(kind === "settlement" ? loanBalance : budgetBalance)} บาท
                </td>
              </tr>
            </tbody>
          </table>
          {kind === "settlement" && data.returnEvidence && (
            <Prose>อ้างอิงหลักฐานคืนเงิน: {data.returnEvidence}</Prose>
          )}
        </>
      )}
      {data.attachmentNotes && (
        <>
          <Heading>เอกสารแนบ</Heading>
          <Prose>{data.attachmentNotes}</Prose>
        </>
      )}
      {/* Keep the meaningful proposal with its sign-off on longer memos too. */}
      <div data-w804-conclusion>
        <Heading>{kind === "purchase" ? "4" : "3"}. ข้อเสนอเพื่อพิจารณา</Heading>
        {kind === "purchase" ? (
          <Prose>
            จึงเรียนมาเพื่อโปรดพิจารณาให้ความเห็นชอบการจัดซื้อ {data.title} วงเงิน{" "}
            {money(requested)} บาท
            และพิจารณามอบหมายผู้รับผิดชอบดำเนินการตามระเบียบและหลักเกณฑ์ของหน่วยงาน
          </Prose>
        ) : kind === "summary" ? (
          <Prose>
            จึงเรียนมาเพื่อโปรดพิจารณารับทราบผลการจัดซื้อ
            และให้ความเห็นชอบค่าใช้จ่ายตามหลักฐานการจ่ายจำนวน {money(spent)} บาท (
            {toThaiBahtText(spent)}) เพื่อดำเนินการตามหลักเกณฑ์ของหน่วยงานต่อไป
          </Prose>
        ) : (
          <Prose>
            จึงเรียนมาเพื่อโปรดพิจารณาการส่งใช้เงินยืมจำนวน {money(data.loanAmount)} บาท
            โดยเสนอหลักฐานการจ่ายจำนวน {money(spent)} บาท พร้อมเงินคงเหลือจำนวน {money(loanBalance)}{" "}
            บาท ({toThaiBahtText(loanBalance)})
            และให้งานการเงินตรวจสอบและดำเนินการหักล้างเงินยืมตามหลักเกณฑ์ของหน่วยงานต่อไป
          </Prose>
        )}
        <Signatures data={data} />
      </div>
      {kind === "purchase" && (
        <>
          <h1 data-page-break-before className={styles.title}>
            รายละเอียดคุณลักษณะเฉพาะ (TOR)
          </h1>
          <div className={styles.subtitle}>{data.title}</div>
          <Heading>1. หลักการและเหตุผล</Heading>
          <Prose>{data.rationale}</Prose>
          <Heading>2. วัตถุประสงค์</Heading>
          <Prose>{data.objectives}</Prose>
          {data.qualifications && (
            <>
              <Heading>คุณสมบัติของผู้เสนอราคา</Heading>
              <Prose>{data.qualifications}</Prose>
            </>
          )}
          <Heading>3. รายละเอียดคุณลักษณะเฉพาะและปริมาณงาน</Heading>
          <Prose>{data.scope}</Prose>
          <ItemTable data={data} specifications />
          {data.quality && (
            <>
              <Heading>คุณภาพของพัสดุ</Heading>
              <Prose>{data.quality}</Prose>
            </>
          )}
          <Heading>4. วงเงินในการจัดซื้อ</Heading>
          <Prose>
            {money(requested)} บาท ({toThaiBahtText(requested)}) รวมภาษี ค่าขนส่ง
            และค่าใช้จ่ายทั้งหมดแล้ว
          </Prose>
          <Heading>5. กำหนดเวลาและสถานที่ส่งมอบ</Heading>
          <Prose>{data.delivery}</Prose>
          {data.payment && (
            <>
              <Heading>การชำระเงิน</Heading>
              <Prose>{data.payment}</Prose>
            </>
          )}
          {data.criteria && (
            <>
              <Heading>หลักเกณฑ์การพิจารณา</Heading>
              <Prose>{data.criteria}</Prose>
            </>
          )}
          {data.penalty && (
            <>
              <Heading>ค่าปรับ/เงื่อนไขอื่นที่กำหนด</Heading>
              <Prose>{data.penalty}</Prose>
            </>
          )}
          <Heading>ผู้กำหนดรายละเอียดคุณลักษณะเฉพาะ</Heading>
          <div className={styles.authors}>
            {data.torAuthors.map((person, i) => (
              <Person key={i} person={person} label="ผู้กำหนดรายละเอียด" />
            ))}
          </div>
        </>
      )}
    </PaginatedDocument>
  );
}
