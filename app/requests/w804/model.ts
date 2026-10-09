import { z } from "zod";
import { W804_LIMIT, type W804DocumentKind } from "./config";

const text = z.string().max(500);
const prose = z.string().max(5000);
const date = z.union([z.literal(""), z.iso.date()]);
const amount = z.number().finite().min(0).max(1_000_000).multipleOf(0.01);
const signature = z.object({ name: text, position: text });
const memo = z.object({ number: text, date });

export const w804DraftSchema = z.object({
  format: z.literal("ubu-pol-w804"),
  version: z.literal(1),
  title: text,
  department: text,
  phone: text,
  addressee: text,
  purchase: memo,
  summary: memo,
  settlement: memo,
  rationale: prose,
  objectives: prose,
  qualifications: prose,
  scope: prose,
  quality: prose,
  delivery: prose,
  payment: prose,
  criteria: prose,
  penalty: prose,
  priceSource: prose,
  budget: z.object({
    fiscalYear: z.string().regex(/^25\d{2}$/),
    source: text,
    plan: text,
    category: text,
    sourceCode: text,
    departmentCode: text,
    fundCode: text,
    activityCode: text,
  }),
  items: z
    .array(
      z.object({
        description: text,
        specification: prose,
        quantity: amount,
        unit: text,
        unitPrice: amount,
      }),
    )
    .max(100),
  approvalNumber: text,
  approvalDate: date,
  approvedAmount: amount,
  receipts: z
    .array(
      z.object({ date, vendor: text, number: text, description: prose, quantity: text, amount }),
    )
    .max(100),
  inspection: prose,
  loanNumber: text,
  loanDate: date,
  loanAmount: amount,
  returnEvidence: text,
  attachmentNotes: prose,
  preparer: signature,
  reviewers: z.array(signature).length(2),
  torAuthors: z.array(signature).length(3),
});
export type W804Draft = z.infer<typeof w804DraftSchema>;
export type W804Item = W804Draft["items"][number];
export type W804Receipt = W804Draft["receipts"][number];
export const blankItem = (): W804Item => ({
  description: "",
  specification: "",
  quantity: 1,
  unit: "",
  unitPrice: 0,
});
export const blankReceipt = (): W804Receipt => ({
  date: "",
  vendor: "",
  number: "",
  description: "",
  quantity: "",
  amount: 0,
});

export function createW804Draft(fiscalYear: string): W804Draft {
  return {
    format: "ubu-pol-w804",
    version: 1,
    title: "",
    department: "สำนักงานเลขานุการ",
    phone: "",
    addressee: "คณบดีคณะรัฐศาสตร์",
    purchase: { number: "อว 0604.19/", date: "" },
    summary: { number: "อว 0604.19/", date: "" },
    settlement: { number: "อว 0604.19/", date: "" },
    rationale: "",
    objectives: "",
    qualifications: "",
    scope: "",
    quality: "",
    delivery: "",
    payment: "",
    criteria: "",
    penalty: "",
    priceSource: "",
    budget: {
      fiscalYear,
      source: "",
      plan: "",
      category: "",
      sourceCode: "",
      departmentCode: "",
      fundCode: "",
      activityCode: "",
    },
    items: [blankItem()],
    approvalNumber: "",
    approvalDate: "",
    approvedAmount: 0,
    receipts: [blankReceipt()],
    inspection: "",
    loanNumber: "",
    loanDate: "",
    loanAmount: 0,
    returnEvidence: "",
    attachmentNotes: "",
    preparer: { name: "", position: "" },
    reviewers: [
      { name: "", position: "" },
      { name: "", position: "" },
    ],
    torAuthors: [
      { name: "", position: "" },
      { name: "", position: "" },
      { name: "", position: "" },
    ],
  };
}

// Round each line to satang before summing, so UI and print use the same ledger.
export function itemTotal(item: W804Item): number {
  return Math.round((item.quantity * item.unitPrice + Number.EPSILON) * 100) / 100;
}
export function totals(data: W804Draft) {
  const requested =
    data.items.reduce((sum, item) => sum + Math.round(itemTotal(item) * 100), 0) / 100;
  const spent = data.receipts.reduce((sum, row) => sum + Math.round(row.amount * 100), 0) / 100;
  return {
    requested,
    spent,
    budgetBalance: Math.round((data.approvedAmount - spent) * 100) / 100,
    loanBalance: Math.round((data.loanAmount - spent) * 100) / 100,
  };
}

/** Drafts may be incomplete; these checks gate printing, never imply approval. */
export function documentErrors(data: W804Draft, kind: W804DocumentKind): string[] {
  if (!w804DraftSchema.safeParse(data).success)
    return ["ข้อมูลมีรูปแบบไม่ถูกต้อง ตรวจสอบวันที่ ตัวเลข และความยาวข้อความ"];
  const errors: string[] = [];
  const need = (value: string, label: string) => {
    if (!value.trim()) errors.push(`กรุณาระบุ${label}`);
  };
  need(data.title, "เรื่อง/ชื่อรายการจัดซื้อ");
  need(data.department, "ส่วนงาน");
  need(data.addressee, "ผู้รับบันทึกข้อความ (เรียน)");
  need(data[kind].date, "วันที่ของรายงานนี้");
  need(data.preparer.name, "ชื่อผู้จัดทำ/ผู้รับผิดชอบ");
  need(data.preparer.position, "ตำแหน่งผู้จัดทำ/ผู้รับผิดชอบ");
  const { requested, spent } = totals(data);
  if (kind === "purchase") {
    need(data.rationale, "เหตุผลและความจำเป็น");
    need(data.objectives, "วัตถุประสงค์ของ TOR");
    need(data.scope, "รายละเอียดคุณลักษณะ/ขอบเขต");
    need(data.delivery, "กำหนดและสถานที่ส่งมอบ");
    need(data.budget.source, "แหล่งเงิน");
    need(data.budget.plan, "แผนงาน");
    if (
      !data.items.length ||
      data.items.some(
        (item) =>
          !item.description.trim() ||
          !item.unit.trim() ||
          item.quantity <= 0 ||
          item.unitPrice <= 0,
      )
    )
      errors.push("กรอกรายการซื้อ จำนวน หน่วย และราคาต่อหน่วยให้ครบ อย่างน้อย 1 รายการ");
    if (requested <= 0 || requested > W804_LIMIT)
      errors.push(
        "วงเงินขอซื้อต้องมากกว่า 0 และไม่เกิน 50,000 บาท รวมภาษีและค่าใช้จ่ายทั้งหมดแล้ว",
      );
  } else {
    need(data.approvalNumber, "เลขที่รายงานขอซื้อที่ได้รับความเห็นชอบ");
    need(data.approvalDate, "วันที่ได้รับความเห็นชอบ");
    if (data.approvedAmount <= 0 || data.approvedAmount > W804_LIMIT)
      errors.push("วงเงินที่ได้รับความเห็นชอบต้องมากกว่า 0 และไม่เกิน 50,000 บาท");
    if (
      !data.receipts.length ||
      data.receipts.some(
        (row) =>
          !row.date ||
          !row.vendor.trim() ||
          !row.number.trim() ||
          !row.description.trim() ||
          !row.quantity.trim() ||
          row.amount <= 0,
      )
    )
      errors.push(
        "กรอกวันที่ ร้านค้า เลขที่หลักฐาน รายการ จำนวน/หน่วย และยอดเงินให้ครบ อย่างน้อย 1 รายการ",
      );
    if (spent <= 0 || spent > data.approvedAmount || spent > W804_LIMIT)
      errors.push(
        "ยอดซื้อจริงต้องมากกว่า 0 และไม่เกินวงเงินที่ได้รับความเห็นชอบ (สูงสุด 50,000 บาท)",
      );
    if (kind === "settlement") {
      need(data.loanNumber, "เลขที่สัญญายืมเงิน");
      need(data.loanDate, "วันที่สัญญายืมเงิน");
      if (
        data.loanAmount <= 0 ||
        data.loanAmount > data.approvedAmount ||
        data.loanAmount > W804_LIMIT
      )
        errors.push("เงินยืมต้องมากกว่า 0 และไม่เกินวงเงินที่ได้รับความเห็นชอบ");
      if (spent > data.loanAmount)
        errors.push("ยอดใช้จริงเกินเงินยืม กรุณาตรวจสอบกับงานการเงินก่อนจัดทำรายงานส่งใช้เงินยืม");
    }
  }
  return errors;
}

export const MAX_DRAFT_BYTES = 250_000;
export function parseW804Draft(contents: string): W804Draft {
  if (new TextEncoder().encode(contents).byteLength > MAX_DRAFT_BYTES)
    throw new Error("ไฟล์แบบร่างใหญ่เกิน 250 KB");
  const result = w804DraftSchema.safeParse(JSON.parse(contents));
  if (!result.success)
    throw new Error("ไฟล์นี้ไม่ใช่แบบร่าง ว804 รุ่นที่ระบบรองรับ หรือข้อมูลไม่ถูกต้อง");
  return result.data;
}
