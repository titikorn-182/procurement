import { z } from "zod";
import { advanceFundingValues } from "@/features/requests/funding";
import { newRequestInputSchema, parseRequestFormData, type NewRequestInput } from "../new/schemas";
import type { ReturnedStandardRequestEditData } from "../[id]/edit/types";
import {
  externalPol01Schema,
  externalLineAmount,
  externalAmountsValid,
  type ExternalPol01,
} from "./schema";

const short = (max: number) => z.string().max(max);
const code = short(50);
export const externalDraftSchema = z
  .object({
    format: z.literal("POL-EXTERNAL-DRAFT"),
    version: z.literal(1),
    title: short(300),
    rationale: short(5000),
    requiredDate: short(10),
    budgetYear: z.number().int().min(2500).max(2700),
    fundSource: short(200),
    planName: short(300),
    expenseCategory: z.enum(["ค่าใช้สอย", "ค่าวัสดุ"]),
    advanceFundingOption: z.enum(["", ...advanceFundingValues]),
    vendor: z.discriminatedUnion("kind", [
      z.object({ kind: z.literal("none") }).strict(),
      z.object({ kind: z.literal("new"), vendorName: short(200) }).strict(),
      z
        .object({ kind: z.literal("registered"), vendorId: short(200), vendorName: short(200) })
        .strict(),
    ]),
    budgetCodes: z
      .object({ sourceCode: code, departmentCode: code, fundCode: code, activityCode: code })
      .strict(),
    metadata: z
      .object({
        version: z.literal(1),
        method: z.enum(["purchase", "rent", "hire"]),
        departmentName: short(300),
        phone: short(50),
        documentNo: short(100),
        memoDate: short(10),
        addressee: short(300),
        workUnit: short(300),
        procurementUnit: short(300),
        torNote: short(500),
      })
      .strict(),
    items: z
      .array(
        z
          .object({
            description: short(500),
            unit: short(100),
            quantity: z.number().finite().positive().max(999_999_999).nullable(),
            unitPrice: z.number().finite().nonnegative().max(999_999_999_999.99).nullable(),
            note: short(300),
          })
          .strict(),
      )
      .min(1)
      .max(200),
  })
  .strict();

export type ExternalDraft = z.infer<typeof externalDraftSchema>;
export const EXTERNAL_STEPS = [
  "ข้อมูลคำขอ",
  "รายการพัสดุ",
  "งบประมาณ",
  "เอกสารแนบ",
  "ตรวจสอบและส่ง",
];
export const fundingOptions = [
  ["borrow_before_purchase", "ต้องการยืมเงินก่อน"],
  ["reimburse_after_purchase", "ไม่ต้องการยืมเงิน (จัดซื้อ/จ้างมาก่อนและทำการเบิก)"],
  ["faculty_direct_pay_credit_vendor", "มอบงานพัสดุจัดซื้อ/จ้างและจ่ายตรงกับร้านค้า"],
] as const;
export const blankExternalItem = (): ExternalDraft["items"][number] => ({
  description: "",
  unit: "",
  quantity: null,
  unitPrice: null,
  note: "",
});
export function externalItemTotal(item: ExternalDraft["items"][number]) {
  return item.quantity != null && item.unitPrice != null
    ? externalLineAmount(item.quantity, item.unitPrice)
    : null;
}
export const externalTotal = (data: ExternalDraft) =>
  Math.round(data.items.reduce((sum, item) => sum + (externalItemTotal(item) ?? 0), 0) * 100) / 100;

export function createExternalDraft(
  date: string,
  initial?: ReturnedStandardRequestEditData,
): ExternalDraft {
  const metadata = initial?.externalPol01;
  return {
    format: "POL-EXTERNAL-DRAFT",
    version: 1,
    title: initial?.title ?? "",
    rationale: initial?.rationale ?? "",
    requiredDate: initial?.requiredDate ?? "",
    budgetYear:
      initial?.budgetYear ??
      Math.max(2570, Number(date.slice(0, 4)) + 543 + (Number(date.slice(5, 7)) >= 10 ? 1 : 0)),
    fundSource: initial?.fundSource ?? "แหล่งทุนภายนอก",
    planName: initial?.planName ?? "",
    expenseCategory: initial?.expenseCategory === "ค่าวัสดุ" ? "ค่าวัสดุ" : "ค่าใช้สอย",
    advanceFundingOption: initial?.advanceFundingOption ?? "",
    vendor: initial?.vendor ?? { kind: "none" },
    budgetCodes: {
      sourceCode: initial?.sourceCode ?? "",
      departmentCode: initial?.departmentCode ?? "",
      fundCode: initial?.fundCode ?? "",
      activityCode: initial?.activityCode ?? "",
    },
    metadata: {
      version: 1,
      method: metadata?.method ?? "hire",
      departmentName:
        metadata?.departmentName ?? "สำนักงานเลขานุการ คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี",
      phone: metadata?.phone ?? "3944",
      documentNo: metadata?.documentNo ?? "อว 0604.19 /",
      memoDate: metadata?.memoDate ?? date,
      addressee: metadata?.addressee ?? "คณบดีคณะรัฐศาสตร์",
      workUnit: metadata?.workUnit ?? "สำนักงานเลขานุการ",
      procurementUnit: metadata?.procurementUnit ?? "งานพัสดุ สำนักงานเลขานุการ",
      torNote: metadata?.torNote ?? "",
    },
    items: initial?.items.map((item, index) => ({
      ...item,
      note: metadata?.itemNotes.find((note) => note.lineNo === index + 1)?.note ?? "",
    })) ?? [blankExternalItem()],
  };
}
export function externalInput(data: ExternalDraft): NewRequestInput {
  const vendor =
    data.vendor.kind === "none"
      ? null
      : data.vendor.kind === "new"
        ? { type: "new", name: data.vendor.vendorName }
        : { type: "registered", id: data.vendor.vendorId, name: data.vendor.vendorName };
  return {
    kind: data.metadata.method === "purchase" ? "purchase" : "hire",
    title: data.title,
    rationale: data.rationale,
    requiredDate: data.requiredDate,
    budgetYear: data.budgetYear,
    fundSource: data.fundSource,
    planName: data.planName,
    expenseCategory: data.expenseCategory,
    formData: {
      externalPol01: {
        ...data.metadata,
        itemNotes: data.items.map((item, index) => ({ lineNo: index + 1, note: item.note })),
      },
      advanceFundingOption: data.advanceFundingOption,
      vendor,
      budgetCodes: data.budgetCodes,
    },
    items: data.items.map((item, index) => ({
      line_no: index + 1,
      description: item.description,
      unit: item.unit,
      quantity: item.quantity ?? 0,
      unit_price: item.unitPrice ?? -1,
    })),
  };
}
export function externalStepError(
  data: ExternalDraft,
  step: number,
  attachmentCount: number,
): string {
  if (step === 0) {
    if (
      data.title.trim().length < 3 ||
      data.rationale.trim().length < 3 ||
      !z.iso.date().safeParse(data.requiredDate).success
    )
      return "กรุณากรอกเรื่องและวัตถุประสงค์อย่างน้อย 3 ตัวอักษร และวันที่ต้องการรับพัสดุ";
    if (!externalPol01Schema.safeParse({ ...data.metadata, itemNotes: [] }).success)
      return "กรุณากรอกส่วนราชการ โทรศัพท์ วันที่ เรียน งาน/สาขา และหน่วยงานพัสดุให้ครบถ้วน";
  }
  if (
    step === 1 &&
    (!data.items.length ||
      data.items.some(
        (item) => !item.description.trim() || !item.unit.trim() || externalItemTotal(item) == null,
      ))
  )
    return "กรุณากรอกรายการ หน่วยนับ จำนวนที่มากกว่า 0 และราคาต่อหน่วย (ระบุ 0 ได้) ให้ครบถ้วน";
  if (step === 2) {
    if (
      !data.fundSource.trim() ||
      !data.planName.trim() ||
      Object.values(data.budgetCodes).some((value) => !value.trim())
    )
      return "กรุณากรอกแหล่งเงิน แผนงาน และรหัสงบประมาณทั้ง 4 ช่อง";
    if (!data.advanceFundingOption) return "กรุณาเลือกวิธีดำเนินการด้านการเงิน";
    if (
      data.advanceFundingOption === "faculty_direct_pay_credit_vendor" &&
      data.vendor.kind === "none"
    )
      return "กรุณาเลือกผู้ประกอบการสำหรับการจ่ายตรงกับร้านค้า";
    if (data.vendor.kind === "new" && !data.vendor.vendorName.trim())
      return "กรุณากรอกชื่อผู้ประกอบการรายใหม่";
  }
  if (step === 3 && data.vendor.kind === "new" && attachmentCount < 1)
    return "กรุณาแนบเอกสารผู้ประกอบการรายใหม่อย่างน้อย 1 ไฟล์";
  return "";
}
export function validateExternalSubmission(data: ExternalDraft, attachmentCount: number) {
  for (let step = 0; step < 4; step++) {
    const error = externalStepError(data, step, attachmentCount);
    if (error) return { step, message: error };
  }
  const input = externalInput(data);
  if (!externalAmountsValid(input.items))
    return {
      step: 1,
      message: "จำนวนและราคาต้องมีทศนิยมไม่เกิน 2 ตำแหน่ง และยอดรวมไม่เกินขอบเขตฐานข้อมูล",
    };
  const parsed = newRequestInputSchema.safeParse(input);
  if (!parsed.success)
    return {
      step: parsed.error.issues[0]?.path[0] === "items" ? 1 : 0,
      message: "กรุณาตรวจสอบวันที่ต้องการรับพัสดุ (วันนี้หรือวันถัดไป) และขนาดข้อมูลในแบบฟอร์ม",
    };
  if (
    !parseRequestFormData(input.formData).success ||
    JSON.stringify(input.formData).length > 20_000
  )
    return {
      step: 2,
      message: "ข้อมูลแบบฟอร์มไม่ถูกต้องหรือมีขนาดเกินกำหนด กรุณาตรวจสอบข้อมูลและลดข้อความหมายเหตุ",
    };
  return null;
}

export function externalMetadata(data: ExternalDraft): ExternalPol01 {
  return {
    ...data.metadata,
    itemNotes: data.items.map((item, index) => ({ lineNo: index + 1, note: item.note })),
  };
}
