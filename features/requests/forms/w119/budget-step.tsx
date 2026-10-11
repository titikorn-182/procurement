import { expenseCategories, fiscalYears, fundSources, inputClass, money } from "./constants";
import type { W119FormController } from "./use-w119-form";
type Props = Pick<
  W119FormController,
  | "fiscalYear"
  | "setFiscalYear"
  | "fundSource"
  | "setFundSource"
  | "planName"
  | "setPlanName"
  | "expenseCategory"
  | "setExpenseCategory"
  | "sourceCode"
  | "setSourceCode"
  | "departmentCode"
  | "setDepartmentCode"
  | "fundCode"
  | "setFundCode"
  | "planCode"
  | "setPlanCode"
  | "subprojectCode"
  | "setSubprojectCode"
  | "activityCode"
  | "setActivityCode"
  | "total"
>;
export function BudgetStep({
  fiscalYear,
  setFiscalYear,
  fundSource,
  setFundSource,
  planName,
  setPlanName,
  expenseCategory,
  setExpenseCategory,
  sourceCode,
  setSourceCode,
  departmentCode,
  setDepartmentCode,
  fundCode,
  setFundCode,
  planCode,
  setPlanCode,
  subprojectCode,
  setSubprojectCode,
  activityCode,
  setActivityCode,
  total,
}: Props) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div>
        <label
          htmlFor="w119-fiscal-year"
          className="mb-2 block text-sm font-semibold text-slate-700"
        >
          ปีงบประมาณ
        </label>
        <select
          id="w119-fiscal-year"
          aria-describedby="w119-fiscal-year-period"
          className={inputClass}
          value={fiscalYear}
          onChange={(event) => setFiscalYear(event.target.value)}
        >
          {fiscalYears.map((year) => (
            <option key={year} value={year}>
              พ.ศ. {year}
            </option>
          ))}
          {!fiscalYears.some((year) => year === fiscalYear) && (
            <option value={fiscalYear} disabled>
              พ.ศ. {fiscalYear} (ข้อมูลเดิม)
            </option>
          )}
        </select>
        <p id="w119-fiscal-year-period" className="mt-2 text-sm text-[var(--line-dark)]">
          1 ตุลาคม {Number(fiscalYear) - 1} – 30 กันยายน {fiscalYear}
        </p>
      </div>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">แหล่งเงิน</span>
        <select
          className={inputClass}
          value={fundSource}
          onChange={(event) => setFundSource(event.target.value)}
        >
          {fundSources.map((source) => (
            <option key={source}>{source}</option>
          ))}
          {!fundSources.includes(fundSource) && (
            <option value={fundSource} disabled>
              {fundSource} (ข้อมูลเดิม)
            </option>
          )}
        </select>
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">แผนงาน</span>
        <input
          className={inputClass}
          placeholder="เช่น แผนงานบริหารทั่วไป"
          value={planName}
          onChange={(event) => setPlanName(event.target.value)}
        />
      </label>
      <label className="block">
        <span className="mb-2 block text-sm font-semibold text-slate-700">หมวดรายจ่าย</span>
        <select
          className={inputClass}
          value={expenseCategory}
          onChange={(event) => setExpenseCategory(event.target.value)}
        >
          {expenseCategories.map((category) => (
            <option key={category}>{category}</option>
          ))}
          {!expenseCategories.includes(expenseCategory) && (
            <option value={expenseCategory} disabled>
              {expenseCategory} (ข้อมูลเดิม)
            </option>
          )}
        </select>
      </label>
      <div className="sm:col-span-2 border-t border-slate-200 pt-5">
        <h3 className="font-bold text-slate-900">รหัสงบประมาณตามแบบฟอร์ม</h3>
        <p id="w119-budget-code-help" className="mt-1 text-sm text-[var(--line-dark)]">
          ข้อความสีเทาเป็นตัวอย่าง กรุณากรอกรหัสจริงสำหรับให้เจ้าหน้าที่การเงินตรวจสอบและคุมยอด
        </p>
      </div>
      {[
        ["รหัสแหล่งเงิน", sourceCode, setSourceCode, "2"],
        ["รหัสหน่วยงาน", departmentCode, setDepartmentCode, "2301"],
        ["รหัสกองทุน", fundCode, setFundCode, "6"],
        ["รหัสแผนงาน", planCode, setPlanCode, "5102"],
        ["รหัสโครงการย่อย", subprojectCode, setSubprojectCode, "51025200"],
        ["รหัสกิจกรรม", activityCode, setActivityCode, "510252000024"],
      ].map(([label, value, setter, example]) => (
        <label key={label as string} className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">{label as string}</span>
          <input
            inputMode="numeric"
            aria-describedby="w119-budget-code-help"
            className={inputClass}
            placeholder={`เช่น ${example}`}
            value={value as string}
            onChange={(event) =>
              (setter as (value: string) => void)(event.target.value.replace(/\D/g, ""))
            }
          />
        </label>
      ))}
      <div className="sm:col-span-2 border border-orange-200 bg-orange-50 p-5">
        <p className="text-sm font-semibold text-orange-900">วงเงินที่จะซื้อหรือจ้าง</p>
        <p className="mt-1 text-2xl font-bold text-orange-700">{money(total)}</p>
        <p className="mt-2 text-sm text-orange-800">
          เจ้าหน้าที่การเงินจะตรวจสอบและคุมยอดงบประมาณในขั้นตอนอนุมัติ
        </p>
      </div>
    </div>
  );
}
