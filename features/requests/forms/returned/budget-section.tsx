import { Pol01ApprovalDetailsFields } from "@/app/requests/new/pol01-approval-details";
import { VendorPicker } from "@/app/requests/new/vendor-picker";
import { reconcilePol01Checklist } from "@/app/requests/pol01-checklist";
import { fieldClass, loanOptions } from "./constants";
import { EditSection } from "./frame";
import type { ReturnedRequestFormController } from "./use-returned-request-form";
type Props = Pick<
  ReturnedRequestFormController,
  | "budgetYear"
  | "setBudgetYear"
  | "planName"
  | "setPlanName"
  | "expenseCategory"
  | "setExpenseCategory"
  | "loanRequirement"
  | "setLoanRequirement"
  | "setDocumentChecklist"
  | "checklistContext"
  | "vendorSelection"
  | "setVendorSelection"
  | "newVendorName"
  | "setNewVendorName"
  | "fundSource"
  | "setFundSource"
  | "sourceCode"
  | "setSourceCode"
  | "departmentCode"
  | "setDepartmentCode"
  | "fundCode"
  | "setFundCode"
  | "activityCode"
  | "setActivityCode"
  | "approvalDetails"
  | "setApprovalDetails"
>;
export function BudgetSection({
  budgetYear,
  setBudgetYear,
  planName,
  setPlanName,
  expenseCategory,
  setExpenseCategory,
  loanRequirement,
  setLoanRequirement,
  setDocumentChecklist,
  checklistContext,
  vendorSelection,
  setVendorSelection,
  newVendorName,
  setNewVendorName,
  fundSource,
  setFundSource,
  sourceCode,
  setSourceCode,
  departmentCode,
  setDepartmentCode,
  fundCode,
  setFundCode,
  activityCode,
  setActivityCode,
  approvalDetails,
  setApprovalDetails,
}: Props) {
  return (
    <EditSection
      title="งบประมาณและผู้ประกอบการ"
      description="ตรวจสอบแหล่งเงิน รหัสงบประมาณ และแนวทางการชำระเงิน"
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">ปีงบประมาณ</span>
          <input
            type="number"
            className={fieldClass}
            value={budgetYear}
            onChange={(event) => setBudgetYear(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">แผนงาน</span>
          <input
            className={fieldClass}
            value={planName}
            onChange={(event) => setPlanName(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">หมวดรายจ่าย</span>
          <input
            className={fieldClass}
            value={expenseCategory}
            onChange={(event) => setExpenseCategory(event.target.value)}
          />
        </label>
      </div>
      <fieldset className="mt-6">
        <legend className="text-sm font-bold">ความต้องการยืมเงิน *</legend>
        <div className="mt-3 grid gap-3 lg:grid-cols-3">
          {loanOptions.map((option) => (
            <label
              key={option.value}
              className={`flex cursor-pointer items-start gap-3 border p-4 ${loanRequirement === option.value ? "border-orange-500 bg-orange-50" : "border-[var(--line)] bg-white"}`}
            >
              <input
                type="radio"
                name="loan-requirement"
                value={option.value}
                checked={loanRequirement === option.value}
                onChange={() => {
                  setLoanRequirement(option.value);
                  setDocumentChecklist((current) =>
                    reconcilePol01Checklist(current, {
                      ...checklistContext,
                      borrowing: option.value === "borrow_before_purchase",
                    }),
                  );
                }}
                className="mt-1 accent-orange-600"
              />
              <span className="text-sm leading-6">{option.label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <div className="mt-6 border-t border-[var(--line)] pt-5">
        <VendorPicker
          value={vendorSelection}
          onChange={(value) => {
            setVendorSelection(value);
            setDocumentChecklist((current) =>
              reconcilePol01Checklist(current, {
                ...checklistContext,
                newVendor: value.kind === "new",
              }),
            );
          }}
          newVendorName={newVendorName}
          onNewVendorNameChange={setNewVendorName}
          required={loanRequirement === "faculty_direct_pay_credit_vendor"}
        />
      </div>
      <div className="mt-6 grid gap-5 border-t border-[var(--line)] pt-5 sm:grid-cols-2">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">แหล่งเงินทุน *</span>
          <select
            className={fieldClass}
            value={fundSource}
            onChange={(event) => setFundSource(event.target.value)}
          >
            <option>เงินงบประมาณแผ่นดิน</option>
            <option>เงินรายได้</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">รหัสแหล่งเงิน *</span>
          <input
            className={fieldClass}
            value={sourceCode}
            onChange={(event) => setSourceCode(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">รหัสหน่วยงาน *</span>
          <input
            className={fieldClass}
            value={departmentCode}
            onChange={(event) => setDepartmentCode(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">รหัสกองทุน *</span>
          <input
            className={fieldClass}
            value={fundCode}
            onChange={(event) => setFundCode(event.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold">รหัสกิจกรรม *</span>
          <input
            className={fieldClass}
            value={activityCode}
            onChange={(event) => setActivityCode(event.target.value)}
          />
        </label>
      </div>
      <div className="mt-6">
        <Pol01ApprovalDetailsFields value={approvalDetails} onChange={setApprovalDetails} />
      </div>
    </EditSection>
  );
}
