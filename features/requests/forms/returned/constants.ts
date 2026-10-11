import type { ReturnedStandardRequestEditData } from "@/app/requests/[id]/edit/types";
export const fieldClass =
  "min-h-11 w-full border border-[var(--line-dark)] bg-white px-3.5 py-2.5 text-base text-[var(--ink)] outline-none transition placeholder:text-stone-500 hover:border-stone-900 focus:border-[var(--blue)] focus:ring-2 focus:ring-blue-100 sm:text-sm";

export const loanOptions: Array<{
  value: ReturnedStandardRequestEditData["advanceFundingOption"];
  label: string;
}> = [
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

export function currency(value: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(value);
}
