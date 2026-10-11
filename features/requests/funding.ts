export const advanceFundingValues = [
  "borrow_before_purchase",
  "reimburse_after_purchase",
  "faculty_direct_pay_credit_vendor",
] as const;

export type AdvanceFundingOption = (typeof advanceFundingValues)[number];

export const advanceFundingLabels: Readonly<Record<AdvanceFundingOption, string>> = {
  borrow_before_purchase: "ต้องการยืมเงินก่อน",
  reimburse_after_purchase: "ไม่ต้องการยืมเงิน (จัดซื้อ/จ้างมาก่อนและทำการเบิก)",
  faculty_direct_pay_credit_vendor:
    "ไม่ต้องการยืมเงิน (มอบงานพัสดุจัดซื้อ/จ้าง กรณีร้านค้าให้เครดิตคณะและจ่ายตรงกับร้านค้า)",
};

export const advanceFundingOptions: ReadonlyArray<{ value: AdvanceFundingOption; label: string }> =
  advanceFundingValues.map((value) => ({ value, label: advanceFundingLabels[value] }));

export function isAdvanceFundingOption(value: unknown): value is AdvanceFundingOption {
  return (
    typeof value === "string" && Object.prototype.hasOwnProperty.call(advanceFundingLabels, value)
  );
}
