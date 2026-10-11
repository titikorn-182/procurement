"use client";
import { AppShell } from "@/app/components/app-shell";
import { Button, PageHeader } from "@/app/components/ui";
import type { ReturnedStandardRequestEditData } from "@/app/requests/[id]/edit/types";
import { AlertCircle, ArrowLeft, Check, RotateCcw } from "lucide-react";
import Link from "next/link";
import { AttachmentsSection } from "./attachments-section";
import { BudgetSection } from "./budget-section";
import { ItemsSection } from "./items-section";
import { RequestSection } from "./request-section";
import { useReturnedRequestForm } from "./use-returned-request-form";
export function ReturnedRequestEditor({ initial }: { initial: ReturnedStandardRequestEditData }) {
  const {
    error,
    kind,
    setKind,
    requiredDate,
    setRequiredDate,
    title,
    setTitle,
    rationale,
    setRationale,
    items,
    updateItem,
    setItems,
    total,
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
    documentChecklist,
    isPending,
    torDocuments,
    setTorDocuments,
    newAttachments,
    setNewAttachments,
    progressMessage,
    handleResubmit,
  } = useReturnedRequestForm(initial);

  return (
    <AppShell>
      <PageHeader
        title={`แก้ไข ${initial.requestNo}`}
        description={
          initial.status === "draft"
            ? "ทำฉบับร่างต่อและส่งเข้าสู่ขั้นตอนตรวจสอบ"
            : "แก้ไขข้อมูลตามความเห็นของผู้ตรวจสอบ แล้วส่งกลับเข้าสู่ขั้นตอนเดิม"
        }
      />

      <div className="my-5 border border-amber-300 bg-amber-50 p-5 text-amber-950" role="status">
        <div className="flex items-start gap-3">
          <RotateCcw className="mt-0.5 shrink-0 text-amber-700" size={21} aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="font-bold">
              {initial.status === "draft" ? "ฉบับร่างที่ยังไม่ได้ส่ง" : "เหตุผลที่ส่งกลับแก้ไข"}
            </h2>
            <p className="mt-1 break-words text-sm leading-6">
              {initial.status === "draft"
                ? "ตรวจข้อมูลและเอกสารแนบให้ครบ แล้วส่งคำขอเพื่อเริ่มการตรวจสอบ"
                : initial.returnReason}
            </p>
            <p className="mt-2 text-sm text-amber-800">
              ระบบจะใช้เลขคำขอเดิมและเก็บประวัติการดำเนินการทั้งหมดไว้
            </p>
          </div>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mb-5 flex items-start gap-3 border border-red-300 bg-[var(--red-soft)] p-4 text-sm text-[var(--red)]"
        >
          <AlertCircle className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      )}

      <div className="min-w-0 max-w-full space-y-5 overflow-x-hidden">
        <RequestSection
          kind={kind}
          setKind={setKind}
          requiredDate={requiredDate}
          setRequiredDate={setRequiredDate}
          title={title}
          setTitle={setTitle}
          rationale={rationale}
          setRationale={setRationale}
        />

        <ItemsSection items={items} updateItem={updateItem} setItems={setItems} total={total} />

        <BudgetSection
          budgetYear={budgetYear}
          setBudgetYear={setBudgetYear}
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
          newVendorName={newVendorName}
          setNewVendorName={setNewVendorName}
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
        />

        <AttachmentsSection
          documentChecklist={documentChecklist}
          checklistContext={checklistContext}
          setDocumentChecklist={setDocumentChecklist}
          isPending={isPending}
          initial={initial}
          torDocuments={torDocuments}
          setTorDocuments={setTorDocuments}
          title={title}
          rationale={rationale}
          newAttachments={newAttachments}
          setNewAttachments={setNewAttachments}
        />

        <section className="border border-[var(--line-dark)] bg-[var(--ink)] p-5 text-white sm:flex sm:items-center sm:justify-between sm:gap-6 sm:p-6">
          <div>
            <h2 className="font-bold">
              {initial.status === "draft" ? "พร้อมส่งคำขอ" : "พร้อมส่งกลับเข้าสู่กระบวนการ"}
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-300">
              ระบบจะส่งไปยังขั้นตอนที่ {initial.status === "draft" ? 2 : initial.currentStep}{" "}
              โดยใช้เลขคำขอ {initial.requestNo} และไม่ลบประวัติเดิม
            </p>
            <p className="mt-2 min-h-5 text-sm font-semibold text-orange-300" aria-live="polite">
              {progressMessage}
            </p>
          </div>
          <div className="mt-4 flex flex-col-reverse gap-3 sm:mt-0 sm:flex-row">
            <Link
              href={`/requests/${initial.requestNo}`}
              className="inline-flex min-h-11 items-center justify-center gap-2 border border-slate-500 px-4 font-semibold hover:bg-slate-800 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            >
              <ArrowLeft size={17} aria-hidden="true" /> ยกเลิก
            </Link>
            <Button
              type="button"
              disabled={isPending}
              onClick={handleResubmit}
              className="min-w-56"
            >
              <Check size={17} aria-hidden="true" />{" "}
              {isPending ? "กำลังดำเนินการ..." : "บันทึกและส่งคำขอใหม่"}
            </Button>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
