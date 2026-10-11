/** Existing POL-01 defaults, not verified current-year policy. Do not apply to W119 or saved data. */
export const pol01Defaults: Readonly<{
  fiscalYear: string;
  fundSource: string;
  planName: string;
  expenseCategory: string;
  sourceCode: string;
  departmentCode: string;
  fundCode: string;
  activityCode: string;
}> = {
  fiscalYear: "2569",
  fundSource: "เงินงบประมาณแผ่นดิน",
  planName: "แผนงานบริหารทั่วไป",
  expenseCategory: "ค่าวัสดุ",
  sourceCode: "2",
  departmentCode: "2301",
  fundCode: "2",
  activityCode: "100210230004",
};
