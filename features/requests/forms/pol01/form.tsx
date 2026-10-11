"use client";
import { AppShell } from "@/app/components/app-shell";
import { Button, PageHeader } from "@/app/components/ui";
import { AlertCircle, ArrowLeft, ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import { AttachmentsStep } from "./attachments-step";
import { BudgetStep } from "./budget-step";
import { steps } from "./constants";
import { SectionCard } from "./frame";
import { ItemsStep } from "./items-step";
import { RequestStep } from "./request-step";
import { ReviewStep } from "./review-step";
import { usePol01Form } from "./use-pol01-form";
export function Pol01Form() {
  const {
    step,
    setStep,
    error,
    requestType,
    setRequestType,
    title,
    setTitle,
    rationale,
    setRationale,
    requiredDate,
    setRequiredDate,
    items,
    updateItem,
    setItems,
    total,
    catalogToggle,
    catalogOpen,
    setCatalogOpen,
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
    documentChecklist,
    isPending,
    draft,
    torDocuments,
    setTorDocuments,
    attachments,
    setAttachments,
    selectedLoanLabel,
    selectedVendorName,
    goNext,
    handleSubmit,
    submissionMessage,
  } = usePol01Form();

  return (
    <AppShell>
      <PageHeader
        title="สร้างคำขอใหม่"
        description="กรอกข้อมูลให้ครบ ระบบจะออกเลขคำขอและส่งต่อให้เจ้าหน้าที่พัสดุตรวจสอบ"
      />

      <nav
        aria-label="ขั้นตอนการสร้างคำขอ"
        className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
      >
        <ol className="flex min-w-[760px] items-center gap-2">
          {steps.map((label, index) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => index < step && setStep(index)}
                disabled={index > step}
                className="flex min-h-11 flex-1 items-center gap-2 rounded-xl px-3 text-left disabled:cursor-not-allowed"
              >
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${index < step ? "bg-emerald-100 text-emerald-700" : index === step ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-600"}`}
                >
                  {index < step ? <Check size={15} /> : index + 1}
                </span>
                <span
                  className={`text-sm font-semibold ${index === step ? "text-slate-900" : "text-slate-500"}`}
                >
                  {label}
                </span>
              </button>
              {index < steps.length - 1 && (
                <span aria-hidden="true" className="h-px w-5 bg-slate-200" />
              )}
            </li>
          ))}
        </ol>
      </nav>

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <AlertCircle className="mt-0.5 shrink-0" size={18} />
          <span>{error}</span>
        </div>
      )}

      <SectionCard title={steps[step]} description={`ขั้นตอนที่ ${step + 1} จาก ${steps.length}`}>
        {step === 0 && (
          <RequestStep
            requestType={requestType}
            setRequestType={setRequestType}
            title={title}
            setTitle={setTitle}
            rationale={rationale}
            setRationale={setRationale}
            requiredDate={requiredDate}
            setRequiredDate={setRequiredDate}
          />
        )}

        {step === 1 && (
          <ItemsStep
            items={items}
            updateItem={updateItem}
            setItems={setItems}
            total={total}
            catalogToggle={catalogToggle}
            catalogOpen={catalogOpen}
            setCatalogOpen={setCatalogOpen}
          />
        )}

        {step === 2 && (
          <BudgetStep
            fiscalYear={fiscalYear}
            setFiscalYear={setFiscalYear}
            planName={planName}
            setPlanName={setPlanName}
            expenseCategory={expenseCategory}
            setExpenseCategory={setExpenseCategory}
            loanRequirement={loanRequirement}
            setLoanRequirement={setLoanRequirement}
            setDocumentChecklist={setDocumentChecklist}
            checklistContext={checklistContext}
            vendorSelection={vendorSelection}
            setVendorSelection={setVendorSelection}
            vendorErrorMessage={vendorErrorMessage}
            setError={setError}
            newVendorName={newVendorName}
            setNewVendorName={setNewVendorName}
            budgetDetailsOpen={budgetDetailsOpen}
            setBudgetDetailsOpen={setBudgetDetailsOpen}
            budgetCodesComplete={budgetCodesComplete}
            fundSource={fundSource}
            setFundSource={setFundSource}
            sourceCode={sourceCode}
            setSourceCode={setSourceCode}
            departmentCode={departmentCode}
            setDepartmentCode={setDepartmentCode}
            fundCode={fundCode}
            setFundCode={setFundCode}
            activityCode={activityCode}
            setActivityCode={setActivityCode}
            approvalDetails={approvalDetails}
            setApprovalDetails={setApprovalDetails}
            total={total}
          />
        )}

        {step === 3 && (
          <AttachmentsStep
            documentChecklist={documentChecklist}
            checklistContext={checklistContext}
            setDocumentChecklist={setDocumentChecklist}
            isPending={isPending}
            draft={draft}
            vendorSelection={vendorSelection}
            torDocuments={torDocuments}
            setTorDocuments={setTorDocuments}
            title={title}
            rationale={rationale}
            attachments={attachments}
            setAttachments={setAttachments}
          />
        )}

        {step === 4 && (
          <ReviewStep
            requestType={requestType}
            title={title}
            rationale={rationale}
            requiredDate={requiredDate}
            items={items}
            selectedLoanLabel={selectedLoanLabel}
            selectedVendorName={selectedVendorName}
            fundSource={fundSource}
            sourceCode={sourceCode}
            departmentCode={departmentCode}
            fundCode={fundCode}
            activityCode={activityCode}
            approvalDetails={approvalDetails}
            total={total}
            attachments={attachments}
            documentChecklist={documentChecklist}
            checklistContext={checklistContext}
            torDocuments={torDocuments}
            vendorSelection={vendorSelection}
          />
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          {step === 0 ? (
            <Link href="/requests">
              <Button type="button" variant="secondary">
                <ArrowLeft size={17} /> ยกเลิก
              </Button>
            </Link>
          ) : (
            <Button
              type="button"
              variant="secondary"
              disabled={isPending || Boolean(draft)}
              onClick={() => {
                setError("");
                setStep((current) => current - 1);
              }}
            >
              <ArrowLeft size={17} /> ย้อนกลับ
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button type="button" onClick={goNext}>
              ถัดไป <ArrowRight size={17} />
            </Button>
          ) : (
            <Button type="button" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "กำลังดำเนินการ..." : draft ? "ลองส่งคำขออีกครั้ง" : "ยืนยันและส่งคำขอ"}{" "}
              {!isPending && <Check size={17} />}
            </Button>
          )}
        </div>
        <p aria-live="polite" className="mt-3 min-h-5 text-right text-sm text-stone-600">
          {submissionMessage}
        </p>
      </SectionCard>
    </AppShell>
  );
}
