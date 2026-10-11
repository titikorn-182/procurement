import { Pol01ApprovalDetailsFields } from "@/app/requests/new/pol01-approval-details";
import { VendorPicker } from "@/app/requests/new/vendor-picker";
import { reconcilePol01Checklist } from "@/app/requests/pol01-checklist";
import { inputClass, loanRequirementOptions, money } from "./constants";
import type { Pol01FormController } from "./use-pol01-form";
type Props = Pick<
  Pol01FormController,
  | "fiscalYear"
  | "setFiscalYear"
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
  | "vendorErrorMessage"
  | "setError"
  | "newVendorName"
  | "setNewVendorName"
  | "budgetDetailsOpen"
  | "setBudgetDetailsOpen"
  | "budgetCodesComplete"
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
  | "total"
>;
export function BudgetStep({
  fiscalYear,
  setFiscalYear,
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
  vendorErrorMessage,
  setError,
  newVendorName,
  setNewVendorName,
  budgetDetailsOpen,
  setBudgetDetailsOpen,
  budgetCodesComplete,
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
  total,
}: Props) {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">ปีงบประมาณ</span>
          <select
            className={inputClass}
            value={fiscalYear}
            onChange={(event) => setFiscalYear(event.target.value)}
          >
            <option>2567</option>
            <option>2568</option>
            <option>2569</option>
            <option>2570</option>
          </select>
        </label>
        <label className="block">
          <span className="mb-2 block text-sm font-semibold text-slate-700">แผนงาน</span>
          <input
            className={inputClass}
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
            <option>ค่าวัสดุ</option>
            <option>ค่าใช้สอย</option>
            <option>ค่าครุภัณฑ์</option>
          </select>
        </label>
      </div>

      <fieldset className="border border-slate-200 bg-white p-5">
        <legend className="sr-only">ความต้องการยืมเงินก่อน</legend>
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center bg-orange-600 text-sm font-bold text-white"
          >
            1
          </span>
          <div>
            <h3 className="font-bold text-slate-900">
              ความต้องการยืมเงินก่อน <span className="text-red-600">*</span>
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              เลือกแนวทางการชำระเงินให้ตรงกับการดำเนินการของคำขอนี้
            </p>
          </div>
        </div>
        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          {loanRequirementOptions.map((option) => {
            const selected = loanRequirement === option.value;
            return (
              <label
                key={option.value}
                className={`flex cursor-pointer items-start gap-3 border p-4 transition ${selected ? "border-orange-500 bg-orange-50 ring-2 ring-orange-100" : "border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50/40"}`}
              >
                <input
                  type="radio"
                  name="loan-requirement"
                  value={option.value}
                  checked={selected}
                  onChange={() => {
                    setLoanRequirement(option.value);
                    setDocumentChecklist((current) =>
                      reconcilePol01Checklist(current, {
                        ...checklistContext,
                        borrowing: option.value === "borrow_before_purchase",
                      }),
                    );
                  }}
                  required
                  className="mt-1 size-4 shrink-0 accent-orange-600"
                />
                <span className="text-sm font-medium leading-6 text-slate-800">{option.label}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <section
        className="border border-slate-200 bg-white p-5"
        aria-labelledby="vendor-selection-heading"
      >
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center bg-orange-600 text-sm font-bold text-white"
          >
            2
          </span>
          <div>
            <h3 id="vendor-selection-heading" className="font-bold text-slate-900">
              เลือกผู้ประกอบการ/ร้านที่ต้องการซื้อ/จ้าง (โดยวิธีเฉพาะเจาะจง)
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              ค้นหาและเลือกจากฐานรายชื่อผู้ประกอบการเดิม หรือระบุรายใหม่หากค้นหาไม่พบ
            </p>
          </div>
        </div>
        <VendorPicker
          allowDirectoryManagement
          value={vendorSelection}
          onChange={(value) => {
            setVendorSelection(value);
            setDocumentChecklist((current) =>
              reconcilePol01Checklist(current, {
                ...checklistContext,
                newVendor: value.kind === "new",
              }),
            );
            if (vendorErrorMessage) setError("");
          }}
          newVendorName={newVendorName}
          onNewVendorNameChange={(value) => {
            setNewVendorName(value);
            if (vendorErrorMessage) setError("");
          }}
          required={loanRequirement === "faculty_direct_pay_credit_vendor"}
          errorMessage={vendorErrorMessage}
        />
      </section>

      <section className="border border-slate-200 bg-white">
        <button
          type="button"
          className="flex min-h-16 w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-slate-50"
          aria-expanded={budgetDetailsOpen}
          aria-controls="budget-source-details"
          onClick={() => setBudgetDetailsOpen((current) => !current)}
        >
          <span className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="grid size-8 shrink-0 place-items-center bg-orange-600 text-sm font-bold text-white"
            >
              3
            </span>
            <span>
              <span className="block font-bold text-slate-900">รายละเอียดแหล่งงบประมาณ</span>
              <span className="mt-1 block text-sm font-normal text-slate-500">
                ระบุแหล่งเงินทุนและรหัสงบประมาณของคำขอ
              </span>
            </span>
          </span>
          <span
            className={`shrink-0 px-3 py-1 text-xs font-bold ${budgetCodesComplete ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}
          >
            {budgetDetailsOpen
              ? "ซ่อนรายละเอียด"
              : budgetCodesComplete
                ? "ข้อมูลครบแล้ว"
                : "กรอกข้อมูล"}
          </span>
        </button>
        {budgetDetailsOpen && (
          <div
            id="budget-source-details"
            className="grid gap-5 border-t border-slate-200 bg-slate-50/70 p-5 sm:grid-cols-2"
          >
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                แหล่งเงินทุน <span className="text-red-600">*</span>
              </span>
              <select
                className={inputClass}
                value={fundSource}
                onChange={(event) => setFundSource(event.target.value)}
                required
              >
                <option>เงินงบประมาณแผ่นดิน</option>
                <option>เงินรายได้</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                รหัสแหล่งเงิน <span className="text-red-600">*</span>
              </span>
              <input
                className={inputClass}
                value={sourceCode}
                onChange={(event) => setSourceCode(event.target.value)}
                placeholder="กรอกรหัสแหล่งเงิน"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                รหัสหน่วยงาน <span className="text-red-600">*</span>
              </span>
              <input
                className={inputClass}
                value={departmentCode}
                onChange={(event) => setDepartmentCode(event.target.value)}
                placeholder="กรอกรหัสหน่วยงาน"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                รหัสกองทุน <span className="text-red-600">*</span>
              </span>
              <input
                className={inputClass}
                value={fundCode}
                onChange={(event) => setFundCode(event.target.value)}
                placeholder="กรอกรหัสกองทุน"
                required
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                รหัสกิจกรรม <span className="text-red-600">*</span>
              </span>
              <input
                className={inputClass}
                value={activityCode}
                onChange={(event) => setActivityCode(event.target.value)}
                placeholder="กรอกรหัสกิจกรรม"
                required
              />
            </label>
          </div>
        )}
      </section>

      <Pol01ApprovalDetailsFields value={approvalDetails} onChange={setApprovalDetails} />

      <div className="border border-orange-200 bg-orange-50 p-5">
        <p className="text-sm font-semibold text-orange-900">ยอดคำขอนี้</p>
        <p className="mt-1 text-2xl font-bold text-orange-700">{money(total)}</p>
        <p className="mt-2 text-sm text-orange-800">
          เจ้าหน้าที่การเงินจะตรวจสอบและคุมยอดงบประมาณในขั้นตอนอนุมัติ
        </p>
      </div>
    </div>
  );
}
