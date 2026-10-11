export type { AdvanceFundingOption as LoanRequirement } from "../../funding";
export { advanceFundingOptions as loanRequirementOptions } from "../../funding";

export const steps = ["ข้อมูลคำขอ", "รายการพัสดุ", "งบประมาณ", "เอกสารแนบ", "ตรวจสอบและส่ง"];

export const inputClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100";

export { formatThaiBaht as money } from "@/lib/format/money";
