/** W119-only options. Older saved values must still be restored, even outside these lists. */
export const fiscalYears = ["2570", "2571", "2572"] as const;
export const fundSources = ["งบประมาณเงินรายได้", "งบประมาณเงินอุดหนุน"];
export const expenseCategories = ["ค่าวัสดุ", "ค่าใช้สอย"];

export const w119Defaults: Readonly<{
  fiscalYear: string;
  fundSource: string;
  expenseCategory: string;
  documentNo: string;
  departmentName: string;
  phone: string;
  addressee: string;
}> = {
  fiscalYear: fiscalYears[0],
  fundSource: fundSources[0],
  expenseCategory: expenseCategories[0],
  documentNo: "อว 0604.19/",
  departmentName: "สำนักงานเลขานุการ คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี",
  phone: "3944",
  addressee: "อธิการบดีมหาวิทยาลัยอุบลราชธานี",
};
