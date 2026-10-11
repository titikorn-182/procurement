"use client";
import { AppShell } from "@/app/components/app-shell";
import { Button, PageHeader } from "@/app/components/ui";
import type { ReturnedW119RequestEditData } from "@/app/requests/[id]/edit/types";
import { W119PrintPreview } from "@/app/requests/w119/w119-print-preview";
import { AlertCircle, ArrowLeft, ArrowRight, Check, Info, Printer } from "lucide-react";
import Link from "next/link";
import { AttachmentsStep } from "./attachments-step";
import { BudgetStep } from "./budget-step";
import { steps } from "./constants";
import { SectionCard } from "./frame";
import { ItemsStep } from "./items-step";
import { MemoStep } from "./memo-step";
import { ReviewStep } from "./review-step";
import { useW119Form } from "./use-w119-form";
export function W119Form({
  printFontClassName,
  initial,
}: {
  printFontClassName: string;
  initial?: ReturnedW119RequestEditData;
}) {
  const {
    previewData,
    attachments,
    setPreviewData,
    previewButtonRef,
    isPending,
    openPreview,
    step,
    setStep,
    draft,
    error,
    departmentName,
    setDepartmentName,
    phone,
    setPhone,
    documentNo,
    setDocumentNo,
    memoDate,
    setMemoDate,
    addressee,
    setAddressee,
    requestType,
    setRequestType,
    title,
    setTitle,
    rationale,
    setRationale,
    requiredDate,
    setRequiredDate,
    selectionCriteria,
    setSelectionCriteria,
    items,
    updateItem,
    setItems,
    hasAllAmounts,
    total,
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
    advanceRequired,
    setAdvanceRequired,
    loanAgreement,
    setLoanAgreement,
    existingAttachments,
    pendingRemovalIds,
    setPendingRemovalIds,
    retainedAttachments,
    pendingRemovalAttachments,
    setAttachments,
    attachmentCount,
    setError,
    goNext,
    handleSubmit,
    submissionMessage,
  } = useW119Form(initial);

  if (previewData)
    return (
      <AppShell>
        <W119PrintPreview
          data={previewData}
          fontClassName={printFontClassName}
          attachments={attachments}
          onClose={() => {
            setPreviewData(null);
            requestAnimationFrame(() => previewButtonRef.current?.focus());
          }}
        />
      </AppShell>
    );

  return (
    <AppShell>
      <PageHeader
        title={initial ? `แก้ไขคำขอ ว119 · ${initial.requestNo}` : "แบบฟอร์มขอซื้อขอจ้าง ว119"}
        description={
          initial
            ? "แก้ไขคำขอที่ถูกส่งกลับ โดยใช้เลขคำขอเดิมและเก็บประวัติการดำเนินการไว้"
            : "สร้างบันทึกข้อความ รายการพัสดุ และข้อมูลงบประมาณในชุดเดียว พร้อมส่งต่อเจ้าหน้าที่พัสดุตรวจสอบ"
        }
      />

      {initial && (
        <div className="mb-5 border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
          <h2 className="font-bold">เหตุผลที่ส่งกลับแก้ไข</h2>
          <p className="mt-1 whitespace-pre-wrap break-words">{initial.returnReason}</p>
          <p className="mt-2">
            เมื่อส่งใหม่ งานจะกลับไปยังขั้นตอนที่ {initial.currentStep}{" "}
            ระบบจะเก็บเอกสารเดิมที่ไม่ได้เลือกลบไว้
          </p>
          <Link
            className="mt-2 inline-block underline underline-offset-4"
            href={`/requests/${initial.requestNo}`}
          >
            กลับไปดูสถานะคำขอ
          </Link>
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-600">ดูแบบ ว119 และดาวน์โหลดฉบับร่างได้ก่อนส่งคำขอ</p>
        <button
          ref={previewButtonRef}
          type="button"
          disabled={isPending}
          onClick={openPreview}
          className="inline-flex min-h-11 items-center gap-2 border border-[var(--line-dark)] bg-white px-4 font-semibold hover:bg-[var(--paper-warm)] disabled:opacity-45"
        >
          <Printer size={17} aria-hidden="true" /> ดูตัวอย่าง / พิมพ์ / PDF
        </button>
      </div>

      <div className="mb-6 flex items-start gap-3 border border-orange-300 bg-orange-50 p-4 text-sm text-orange-950">
        <Info className="mt-0.5 shrink-0 text-[var(--orange)]" size={19} />
        <div>
          <p className="font-bold">แบบฟอร์มตามหนังสือ ด่วนที่สุด ที่ กค (กวจ) 0405.2/ว119</p>
          <p className="mt-1 leading-6 text-orange-900">
            ลงวันที่ 7 มีนาคม 2561 · ระบบจะนำข้อมูลชุดนี้ไปจัดทำบันทึกข้อความ รายการแนบ
            และรายงานสำหรับขั้นตอนพัสดุ
          </p>
        </div>
      </div>

      <nav
        aria-label="ขั้นตอนการสร้างคำขอ"
        className="mb-6 overflow-x-auto border border-[var(--line-dark)] bg-white p-3"
      >
        <ol className="flex min-w-[760px] items-center gap-2">
          {steps.map((label, index) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => index < step && setStep(index)}
                disabled={index > step || isPending || Boolean(draft)}
                aria-current={index === step ? "step" : undefined}
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

      <SectionCard
        disabled={isPending}
        title={steps[step]}
        description={`ขั้นตอนที่ ${step + 1} จาก ${steps.length} · ข้อมูลจะถูกบันทึกในคำขอเดียวกัน`}
      >
        {step === 0 && (
          <MemoStep
            departmentName={departmentName}
            setDepartmentName={setDepartmentName}
            phone={phone}
            setPhone={setPhone}
            documentNo={documentNo}
            setDocumentNo={setDocumentNo}
            memoDate={memoDate}
            setMemoDate={setMemoDate}
            addressee={addressee}
            setAddressee={setAddressee}
            requestType={requestType}
            setRequestType={setRequestType}
            title={title}
            setTitle={setTitle}
            rationale={rationale}
            setRationale={setRationale}
            requiredDate={requiredDate}
            setRequiredDate={setRequiredDate}
            selectionCriteria={selectionCriteria}
            setSelectionCriteria={setSelectionCriteria}
          />
        )}

        {step === 1 && (
          <ItemsStep
            items={items}
            updateItem={updateItem}
            setItems={setItems}
            hasAllAmounts={hasAllAmounts}
            total={total}
          />
        )}

        {step === 2 && (
          <BudgetStep
            fiscalYear={fiscalYear}
            setFiscalYear={setFiscalYear}
            fundSource={fundSource}
            setFundSource={setFundSource}
            planName={planName}
            setPlanName={setPlanName}
            expenseCategory={expenseCategory}
            setExpenseCategory={setExpenseCategory}
            sourceCode={sourceCode}
            setSourceCode={setSourceCode}
            departmentCode={departmentCode}
            setDepartmentCode={setDepartmentCode}
            fundCode={fundCode}
            setFundCode={setFundCode}
            planCode={planCode}
            setPlanCode={setPlanCode}
            subprojectCode={subprojectCode}
            setSubprojectCode={setSubprojectCode}
            activityCode={activityCode}
            setActivityCode={setActivityCode}
            total={total}
          />
        )}

        {step === 3 && (
          <AttachmentsStep
            advanceRequired={advanceRequired}
            setAdvanceRequired={setAdvanceRequired}
            loanAgreement={loanAgreement}
            setLoanAgreement={setLoanAgreement}
            total={total}
            openPreview={openPreview}
            isPending={isPending}
            existingAttachments={existingAttachments}
            pendingRemovalIds={pendingRemovalIds}
            setPendingRemovalIds={setPendingRemovalIds}
            retainedAttachments={retainedAttachments}
            pendingRemovalAttachments={pendingRemovalAttachments}
            attachments={attachments}
            setAttachments={setAttachments}
            initial={initial}
          />
        )}

        {step === 4 && (
          <ReviewStep
            requestType={requestType}
            title={title}
            rationale={rationale}
            documentNo={documentNo}
            memoDate={memoDate}
            addressee={addressee}
            requiredDate={requiredDate}
            items={items}
            fundSource={fundSource}
            total={total}
            selectionCriteria={selectionCriteria}
            sourceCode={sourceCode}
            departmentCode={departmentCode}
            fundCode={fundCode}
            planCode={planCode}
            advanceRequired={advanceRequired}
            loanAgreement={loanAgreement}
            attachmentCount={attachmentCount}
            initial={initial}
            retainedAttachments={retainedAttachments}
            attachments={attachments}
            pendingRemovalAttachments={pendingRemovalAttachments}
          />
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          {step === 0 ? (
            <Link href={initial ? `/requests/${initial.requestNo}` : "/requests"}>
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
              {isPending
                ? "กำลังดำเนินการ..."
                : initial
                  ? "บันทึกการแก้ไขและส่งใหม่"
                  : draft
                    ? "ลองส่งคำขออีกครั้ง"
                    : "ยืนยันและส่งคำขอ"}{" "}
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
