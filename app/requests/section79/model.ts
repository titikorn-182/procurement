import { z } from "zod";

export const SECTION79_TITLE = "คำขอซื้อ/จ้าง ข้อ 79 วรรค 2";
export const SECTION79_SUBJECT =
  "รายงานขอความเห็นชอบและขออนุมัติการจัดซื้อ/จัดจ้าง พร้อมขออนุมัติเบิกจ่าย ตามระเบียบกระทรวงการคลัง ฯ ข้อ 79 วรรคสอง";
// This is the supplied template's limit, not a determination of legal eligibility.
export const SECTION79_LIMIT = 500_000;
export const MAX_DRAFT_BYTES = 250 * 1024;
export const SIGNATORY_ROLES = [
  "ความเห็นของเจ้าหน้าที่พัสดุ",
  "ความเห็นของหัวหน้าเจ้าหน้าที่พัสดุ",
  "ความเห็นของเจ้าหน้าที่งานการเงิน",
  "ความเห็นของหัวหน้าสำนักงานคณะรัฐศาสตร์",
  "ความเห็นของรองคณบดีกำกับดูแลงานพัสดุ",
  "คำสั่งคณบดีคณะรัฐศาสตร์",
] as const;

const text = z.string().max(500);
const prose = z.string().max(5000);
const code = z.string().max(30);
const date = z.union([z.literal(""), z.iso.date()]);
const fiscalYear = z.union([z.literal(""), z.string().regex(/^25\d{2}$/)]);

export const section79DraftSchema = z.object({
  format: z.literal("ubu-pol-section79"),
  version: z.literal(1),
  department: text,
  phone: text,
  memoNumber: text,
  memoDate: date,
  addressee: text,
  subject: text,
  kind: z.enum(["purchase", "hire"]),
  description: prose,
  requester: z.object({ name: text, position: text }),
  vendor: text,
  receipt: z.object({
    kind: z.enum(["receipt", "delivery"]),
    book: text,
    number: text,
    date,
  }),
  urgentReason: prose,
  amount: z.number().finite().min(0).max(SECTION79_LIMIT).multipleOf(0.01).nullable(),
  payee: text,
  budget: z.object({
    fiscalYear,
    source: text,
    fund: text,
    activity: text,
    project: text,
    sourceCode: code,
    departmentCode: code,
    fundCode: code,
    activityCode: code,
  }),
  signatories: z.array(z.object({ name: text, position: text })).length(6),
});

export type Section79Draft = z.infer<typeof section79DraftSchema>;

export function createSection79Draft(fiscalYear: string): Section79Draft {
  return {
    format: "ubu-pol-section79",
    version: 1,
    department: "สำนักงานเลขานุการ คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี",
    phone: "3944",
    memoNumber: "อว 0604.19/",
    memoDate: "",
    addressee: "อธิการบดีมหาวิทยาลัยอุบลราชธานี (ผ่านหัวหน้าเจ้าหน้าที่พัสดุ)",
    subject: SECTION79_SUBJECT,
    kind: "purchase",
    description: "",
    requester: { name: "", position: "" },
    vendor: "",
    receipt: { kind: "receipt", book: "", number: "", date: "" },
    urgentReason: "",
    amount: null,
    payee: "",
    budget: {
      fiscalYear,
      source: "",
      fund: "",
      activity: "",
      project: "",
      sourceCode: "",
      departmentCode: "",
      fundCode: "",
      activityCode: "",
    },
    signatories: [
      { name: "", position: "นักวิชาการพัสดุ" },
      { name: "", position: "หัวหน้าเจ้าหน้าที่พัสดุ" },
      { name: "", position: "นักวิชาการเงินและบัญชี" },
      { name: "", position: "หัวหน้าสำนักงานเลขานุการคณะรัฐศาสตร์" },
      { name: "", position: "รองคณบดีกำกับดูแลงานพัสดุ" },
      { name: "", position: "คณบดีคณะรัฐศาสตร์ ปฏิบัติการแทนอธิการบดีมหาวิทยาลัยอุบลราชธานี" },
    ],
  };
}

export function parseSection79Draft(contents: string): Section79Draft {
  if (new TextEncoder().encode(contents).byteLength > MAX_DRAFT_BYTES)
    throw new Error("ไฟล์แบบร่างใหญ่เกิน 250 KB");
  let parsed: unknown;
  try {
    parsed = JSON.parse(contents);
  } catch {
    throw new Error("ไฟล์แบบร่างไม่ใช่ JSON ที่ถูกต้อง");
  }
  const result = section79DraftSchema.safeParse(parsed);
  if (!result.success)
    throw new Error("ไฟล์นี้ไม่ใช่แบบร่าง ข้อ 79 วรรค 2 รุ่นที่ระบบรองรับ หรือข้อมูลไม่ถูกต้อง");
  return result.data;
}

const stepSchemas = [
  section79DraftSchema.pick({
    format: true,
    version: true,
    department: true,
    phone: true,
    memoNumber: true,
    memoDate: true,
    addressee: true,
    subject: true,
    kind: true,
    description: true,
    requester: true,
    vendor: true,
    receipt: true,
    urgentReason: true,
  }),
  section79DraftSchema.pick({
    format: true,
    version: true,
    amount: true,
    payee: true,
    budget: true,
  }),
  section79DraftSchema.pick({ format: true, version: true, signatories: true }),
] as const;

const fieldLabels: Record<string, string> = {
  department: "ส่วนงาน",
  phone: "โทรศัพท์",
  memoNumber: "เลขที่หนังสือ",
  memoDate: "วันที่บันทึกข้อความ",
  addressee: "ผู้รับบันทึกข้อความ (เรียน)",
  subject: "เรื่อง",
  kind: "ประเภทการจัดซื้อ/จัดจ้าง",
  description: "รายการและรายละเอียดการจัดซื้อ/จัดจ้าง",
  requester: "ข้อมูลผู้ดำเนินการจัดซื้อ/จัดจ้าง",
  "requester.name": "ชื่อผู้ดำเนินการจัดซื้อ/จัดจ้าง",
  "requester.position": "ตำแหน่งผู้ดำเนินการจัดซื้อ/จัดจ้าง",
  vendor: "ผู้ประกอบการ/ร้านค้า",
  receipt: "ข้อมูลหลักฐานการจัดซื้อ/จัดจ้าง",
  "receipt.kind": "ประเภทหลักฐาน",
  "receipt.book": "เล่มที่หลักฐาน",
  "receipt.number": "เลขที่หลักฐาน",
  "receipt.date": "วันที่ใบเสร็จรับเงิน/ใบส่งของ",
  urgentReason: "เหตุจำเป็นเร่งด่วน",
  amount: "จำนวนเงิน",
  payee: "ผู้รับเงิน",
  budget: "ข้อมูลงบประมาณ",
  "budget.fiscalYear": "ปีงบประมาณ พ.ศ.",
  "budget.source": "แหล่งเงิน",
  "budget.fund": "กองทุน",
  "budget.activity": "กิจกรรม",
  "budget.project": "งาน/โครงการ",
  "budget.sourceCode": "รหัสแหล่งเงิน",
  "budget.departmentCode": "รหัสหน่วยงาน",
  "budget.fundCode": "รหัสกองทุน",
  "budget.activityCode": "รหัสกิจกรรม",
};

function schemaErrors(issues: z.ZodError["issues"]): string[] {
  return [
    ...new Set(
      issues.map((issue) => {
        const path = issue.path.join(".");
        let label = fieldLabels[path] ?? "ข้อมูล";
        if (issue.path[0] === "signatories") {
          if (issue.path.length === 1) return "ข้อมูลผู้ลงนามต้องมีครบ 6 ส่วนตามแบบฟอร์ม";
          const index = Number(issue.path[1]) + 1;
          label = `${issue.path[2] === "position" ? "ตำแหน่ง" : "ชื่อ"}ผู้ลงนาม ส่วนที่ ${index} `;
        }
        if (path === "format" || path === "version")
          return "ข้อมูลต้องเป็นแบบร่าง ข้อ 79 วรรค 2 รุ่นที่ระบบรองรับ";
        if (path === "amount") {
          if (issue.code === "too_big") return "จำนวนเงินต้องไม่เกิน 500,000 บาทตามแบบฟอร์มที่แนบ";
          if (issue.code === "too_small") return "จำนวนเงินต้องไม่ติดลบ";
          if (issue.code === "not_multiple_of") return "จำนวนเงินต้องมีทศนิยมไม่เกิน 2 ตำแหน่ง";
          return "จำนวนเงินต้องเป็นตัวเลขที่ถูกต้อง";
        }
        if (path === "memoDate" || path === "receipt.date")
          return `${label}ต้องเป็นวันที่มีอยู่จริง ในรูปแบบ ปี ค.ศ.-เดือน-วัน (YYYY-MM-DD)`;
        if (path === "budget.fiscalYear") return "ปีงบประมาณต้องเป็น พ.ศ. 4 หลัก เช่น 2570";
        if (issue.code === "too_big")
          return `${label}ต้องไม่เกิน ${String(issue.maximum)} ตัวอักษร`;
        return `${label}มีรูปแบบไม่ถูกต้อง กรุณาตรวจสอบข้อมูล`;
      }),
    ),
  ];
}

/** These completeness checks prepare a document; they do not record or imply approval. */
function requiredStepErrors(data: Section79Draft, step: 0 | 1 | 2): string[] {
  const errors: string[] = [];
  const need = (value: string, label: string) => {
    if (!value.trim()) errors.push(`กรุณาระบุ${label}`);
  };
  if (step === 0) {
    need(data.department, "ส่วนงาน");
    need(data.memoDate, "วันที่บันทึกข้อความ");
    need(data.addressee, "ผู้รับบันทึกข้อความ (เรียน)");
    need(data.subject, "เรื่อง");
    need(data.requester.name, "ชื่อผู้ดำเนินการจัดซื้อ/จัดจ้าง");
    need(data.requester.position, "ตำแหน่งผู้ดำเนินการจัดซื้อ/จัดจ้าง");
    need(data.description, "รายการและรายละเอียดการจัดซื้อ/จัดจ้าง");
    need(data.vendor, "ผู้ประกอบการ/ร้านค้า");
    need(data.receipt.number, "เลขที่ใบเสร็จรับเงิน/ใบส่งของ");
    need(data.receipt.date, "วันที่ใบเสร็จรับเงิน/ใบส่งของ");
    need(data.urgentReason, "เหตุจำเป็นเร่งด่วนที่ไม่อาจดำเนินการตามปกติได้ทัน");
    if (data.receipt.date && data.memoDate && data.receipt.date > data.memoDate)
      errors.push("วันที่ใบเสร็จรับเงิน/ใบส่งของต้องไม่อยู่หลังวันที่บันทึกข้อความ");
  }
  if (step === 1) {
    if (data.amount === null || data.amount <= 0)
      errors.push("กรุณาระบุจำนวนเงินมากกว่า 0 และไม่เกิน 500,000 บาทตามแบบฟอร์มที่แนบ");
    need(data.payee, "ผู้รับเงิน");
    need(data.budget.fiscalYear, "ปีงบประมาณ");
    need(data.budget.source, "แหล่งเงิน");
    need(data.budget.fund, "กองทุน");
    need(data.budget.activity, "กิจกรรม");
    need(data.budget.project, "โครงการ");
  }
  // Signatory identities are optional; decisions, signatures and dates remain unfilled.
  return errors;
}

export function section79StepErrors(data: Section79Draft, step: 0 | 1 | 2): string[] {
  const result = stepSchemas[step].safeParse(data);
  if (!result.success) return schemaErrors(result.error.issues);
  return requiredStepErrors(data, step);
}

export function documentErrors(data: Section79Draft): string[] {
  const result = section79DraftSchema.safeParse(data);
  if (!result.success) return schemaErrors(result.error.issues);
  return [...requiredStepErrors(data, 0), ...requiredStepErrors(data, 1)];
}
