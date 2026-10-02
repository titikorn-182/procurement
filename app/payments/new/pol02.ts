import type { PaymentDetails, PaymentLine, SourceRequest } from "./types";

export const procurementMethods = [
  "วิธีเฉพาะเจาะจง",
  "วิธีคัดเลือก",
  "วิธีประกวดราคาอิเล็กทรอนิกส์ (e-bidding)",
  "วิธีตลาดอิเล็กทรอนิกส์ (e-market)",
  "วิธีสอบราคา",
  "อื่น ๆ",
] as const;

export const attachmentTypeOptions = [
  "ใบส่งของ/ใบแจ้งหนี้",
  "ใบกำกับภาษี",
  "ใบเสร็จรับเงิน",
  "ใบตรวจรับ",
  "สัญญา/ใบสั่งซื้อ/ใบสั่งจ้าง",
  "เอกสารอื่น ๆ",
] as const;

export const pol02DocumentChecklist = [
  { id: "purchase_request", label: "รายงานขอซื้อขอจ้าง (ใบ PR) และหลักฐานความเห็นชอบ" },
  {
    id: "procurement_approval",
    label: "หลักฐานอนุมัติสั่งซื้อสั่งจ้าง ประกาศผล หรือเอกสารตามวิธีจัดซื้อจัดจ้าง",
  },
  {
    id: "contract",
    label: "สัญญา ใบสั่งซื้อ ใบสั่งจ้าง ข้อตกลง และเอกสารแก้ไข (ถ้ามี)",
  },
  {
    id: "delivery_invoice",
    label: "ใบส่งของหรือใบส่งมอบงาน พร้อมใบแจ้งหนี้หรือใบกำกับภาษี",
  },
  {
    id: "inspection",
    label: "รายงานหรือใบตรวจรับ พร้อมหลักฐานการแต่งตั้งผู้ตรวจรับ",
  },
  { id: "asset_register", label: "หลักฐานรับเข้าทะเบียนพัสดุหรือครุภัณฑ์ (ถ้ามี)" },
  {
    id: "payment_evidence",
    label: "ใบเสร็จหรือหลักฐานการจ่าย กรณีสำรองจ่ายหรือชดใช้เงินยืม",
  },
  { id: "other", label: "เอกสารประกอบอื่น ๆ" },
] as const;

export function createPaymentDetails(source: SourceRequest): PaymentDetails {
  const remaining = Math.max(0, source.approved - source.paid);
  return {
    approvalDate: source.approvedDate,
    subject: source.title,
    projectActivity: source.planName,
    procurementMethod: procurementMethods[0],
    egpProjectNo: "",
    contractNo: "",
    contractDate: "",
    vendorName: source.vendorName,
    vendorTaxId: "",
    contractAmount: String(remaining || source.approved),
    installmentNumber: "1",
    installmentCount: "1",
    invoiceNo: "",
    invoiceDate: "",
    vat: "0",
    delivery: "",
  };
}

export function createPaymentLines(source: SourceRequest): PaymentLine[] {
  if (source.items.length === 0 || source.paid > 0) {
    return [
      {
        id: crypto.randomUUID(),
        description: source.title,
        attachmentType: attachmentTypeOptions[0],
        documentNo: "",
        quantity: "1",
        unitPrice: String(Math.max(0, source.approved - source.paid)),
      },
    ];
  }

  return source.items.map((item) => ({
    id: crypto.randomUUID(),
    description: item.description,
    attachmentType: attachmentTypeOptions[0],
    documentNo: "",
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
  }));
}

export function paymentLineAmount(line: PaymentLine) {
  return (Number(line.quantity) || 0) * (Number(line.unitPrice) || 0);
}

const thaiDigits = ["ศูนย์", "หนึ่ง", "สอง", "สาม", "สี่", "ห้า", "หก", "เจ็ด", "แปด", "เก้า"];
const thaiPositions = ["", "สิบ", "ร้อย", "พัน", "หมื่น", "แสน"];

function readThaiChunk(rawValue: string) {
  const value = rawValue.replace(/^0+/, "");
  if (!value) return "";

  return [...value]
    .map((digit, index) => {
      const numericDigit = Number(digit);
      if (numericDigit === 0) return "";
      const position = value.length - index - 1;
      if (position === 1 && numericDigit === 1) return "สิบ";
      if (position === 1 && numericDigit === 2) return "ยี่สิบ";
      if (position === 0 && numericDigit === 1 && value.length > 1) return "เอ็ด";
      return `${thaiDigits[numericDigit]}${thaiPositions[position]}`;
    })
    .join("");
}

function readThaiInteger(rawValue: string): string {
  const value = rawValue.replace(/^0+/, "") || "0";
  if (value.length <= 6) return readThaiChunk(value);
  const leading = value.slice(0, -6);
  const trailing = value.slice(-6);
  return `${readThaiInteger(leading)}ล้าน${readThaiChunk(trailing)}`;
}

export function toThaiBahtText(amount: number) {
  if (!Number.isFinite(amount) || amount < 0) return "—";
  const [baht, satang] = amount.toFixed(2).split(".");
  const bahtText = baht === "0" ? "ศูนย์" : readThaiInteger(baht);
  if (satang === "00") return `${bahtText}บาทถ้วน`;
  return `${bahtText}บาท${readThaiInteger(satang)}สตางค์`;
}
