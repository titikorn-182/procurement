export type LoanRequirement =
  "borrow_before_purchase" | "reimburse_after_purchase" | "faculty_direct_pay_credit_vendor";

export const loanRequirementOptions: Array<{ value: LoanRequirement; label: string }> = [
  {
    value: "borrow_before_purchase",
    label: "ต้องการยืมเงินก่อน",
  },
  {
    value: "reimburse_after_purchase",
    label: "ไม่ต้องการยืมเงิน (จัดซื้อ/จ้างมาก่อนและทำการเบิก)",
  },
  {
    value: "faculty_direct_pay_credit_vendor",
    label:
      "ไม่ต้องการยืมเงิน (มอบงานพัสดุจัดซื้อ/จ้าง กรณีร้านค้าให้เครดิตคณะและจ่ายตรงกับร้านค้า)",
  },
];

export const steps = ["ข้อมูลคำขอ", "รายการพัสดุ", "งบประมาณ", "เอกสารแนบ", "ตรวจสอบและส่ง"];

export const inputClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100";

export function money(value: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(value);
}
