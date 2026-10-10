import { z } from "zod";

const required = (label: string, max: number) =>
  z.string().trim().min(1, `กรุณาระบุ${label}`).max(max, `${label}ยาวเกิน ${max} ตัวอักษร`);
const date = (label: string) =>
  z.string().refine((value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const parsed = new Date(`${value}T00:00:00Z`);
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }, `กรุณาระบุ${label}ให้ถูกต้อง`);

export const loanAgreementSchema = z
  .object({
    contractNo: z.string().trim().max(100),
    borrowerName: required("ชื่อ-นามสกุลผู้ยืม", 200),
    borrowerPosition: required("ตำแหน่งผู้ยืม", 200),
    affiliation: required("สังกัดผู้ยืม", 300),
    projectType: z.enum(["project", "activity"]),
    projectName: required("ชื่อโครงการหรือกิจกรรม", 300),
    purpose: required("รายละเอียดค่าใช้จ่าย", 1000),
    endDate: date("วันสิ้นสุดโครงการหรือกิจกรรม"),
    accountName: required("ชื่อบัญชีรับโอน", 200),
    accountNumber: required("เลขที่บัญชีรับโอน", 40)
      .regex(/^[0-9 -]{6,40}$/, "กรุณาระบุเลขที่บัญชีเป็นตัวเลข โดยคงเลขศูนย์นำหน้าไว้")
      .refine(
        (value) => (value.match(/\d/g) ?? []).length >= 6,
        "กรุณาระบุเลขที่บัญชีอย่างน้อย 6 หลัก",
      ),
    bankName: required("ธนาคาร", 200),
    transferDate: date("วันที่ต้องการรับโอนเงิน"),
    transferPurpose: required("วัตถุประสงค์การโอนเงิน", 300),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.transferDate > data.endDate)
      ctx.addIssue({
        code: "custom",
        path: ["transferDate"],
        message: "วันที่ต้องการรับโอนเงินต้องไม่หลังวันสิ้นสุดโครงการหรือกิจกรรม",
      });
  });

export type LoanAgreement = z.infer<typeof loanAgreementSchema>;

/** Read saved or incomplete draft data without inserting sample people or bank details. */
export function readLoanAgreement(value: unknown): LoanAgreement | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  const row = value as Record<string, unknown>;
  const text = (key: string) => (typeof row[key] === "string" ? row[key].trim() : "");
  return {
    contractNo: text("contractNo"),
    borrowerName: text("borrowerName"),
    borrowerPosition: text("borrowerPosition"),
    affiliation: text("affiliation"),
    projectType: row.projectType === "activity" ? "activity" : "project",
    projectName: text("projectName"),
    purpose: text("purpose"),
    endDate: text("endDate"),
    accountName: text("accountName"),
    accountNumber: text("accountNumber"),
    bankName: text("bankName"),
    transferDate: text("transferDate"),
    transferPurpose: text("transferPurpose"),
  };
}

export function emptyLoanAgreement(): LoanAgreement {
  return {
    ...readLoanAgreement({})!,
    affiliation: "สำนักงานเลขานุการคณะรัฐศาสตร์",
    projectType: "project",
  };
}

/** The supplied POL-2569 template states 15 calendar days after the end date. */
export function loanDueDate(endDate: string): string {
  if (!date("วันที่").safeParse(endDate).success) return "";
  const result = new Date(`${endDate}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + 15);
  return result.toISOString().slice(0, 10);
}
