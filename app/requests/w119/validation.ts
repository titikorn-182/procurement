import { newRequestInputSchema, w119RequestFormSchema, type NewRequestInput } from "../new/schemas";
import { maxAttachmentCount, maxTotalAttachmentSizeBytes } from "../../lib/request-attachments";

type ValidationIssue = { step: number; message: string };

export function validateW119Submission(
  input: NewRequestInput,
  attachmentCount: number,
  attachmentBytes: number,
): ValidationIssue | null {
  const parsed = newRequestInputSchema.safeParse(input);
  if (!parsed.success) {
    const field = parsed.error.issues[0]?.path[0];
    if (field === "requiredDate")
      return {
        step: 0,
        message: "กรุณาตรวจสอบวันที่ต้องการใช้ โดยระบุวันที่วันนี้หรือวันถัดไปตามเงื่อนไขของระบบ",
      };
    if (field === "items")
      return { step: 1, message: "กรุณาตรวจสอบรายการ จำนวน หน่วย และราคาให้ครบถ้วนและถูกต้อง" };
    if (["budgetYear", "fundSource", "planName", "expenseCategory"].includes(String(field))) {
      return { step: 2, message: "กรุณาตรวจสอบปีงบประมาณ แหล่งเงิน แผนงาน และหมวดรายจ่าย" };
    }
    return {
      step: 0,
      message:
        "กรุณาตรวจสอบเรื่องและเหตุผล (อย่างน้อย 3 ตัวอักษร เรื่องไม่เกิน 300 และเหตุผลไม่เกิน 5,000 ตัวอักษร)",
    };
  }
  const form = w119RequestFormSchema.safeParse(input.formData);
  if (!form.success) {
    const budget = form.error.issues[0]?.path[0] === "budgetCodes";
    return {
      step: budget ? 2 : 0,
      message: budget
        ? "กรุณาระบุรหัสงบประมาณให้ครบทั้ง 6 ช่อง"
        : "กรุณาตรวจสอบส่วนงาน เลขที่หนังสือ วันที่บันทึก โทรศัพท์ และผู้รับบันทึกให้ครบถ้วน",
    };
  }
  if (input.items.some((item) => item.market_price == null || !item.price_source?.trim())) {
    return { step: 1, message: "กรุณาระบุราคากลางและแหล่งที่มาของราคาทุกรายการในแบบ ว119" };
  }
  if (attachmentCount === 0)
    return {
      step: 3,
      message: "กรุณาแนบใบเสนอราคา รายละเอียดคุณลักษณะ หรือหลักฐานราคาอย่างน้อย 1 ไฟล์",
    };
  if (attachmentCount > maxAttachmentCount || attachmentBytes > maxTotalAttachmentSizeBytes) {
    return {
      step: 3,
      message: `เอกสารเดิมและไฟล์ใหม่รวมกันต้องไม่เกิน ${maxAttachmentCount} ไฟล์ และขนาดรวมไม่เกิน 50 MB`,
    };
  }
  return null;
}
