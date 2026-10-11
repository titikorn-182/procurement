import type { SelectedAttachment } from "@/app/lib/request-attachments";
import { validateAttachmentCandidates } from "@/app/lib/request-attachments";
import { uploadRequestAttachments } from "@/app/lib/request-attachments.client";
import { createRequestDraft, submitRequestDraft } from "@/app/requests/new/actions";
import {
  emptyPol01Item,
  pol01ItemAmount,
  pol01ItemExamples,
  pol01ItemsPayload,
  type Pol01ItemInput,
} from "@/app/requests/new/item-input";
import { type VendorChoice } from "@/app/requests/new/vendor-picker";
import { createDefaultPol01ApprovalDetails } from "@/app/requests/pol01";
import { createPol01Checklist, reconcilePol01Checklist } from "@/app/requests/pol01-checklist";
import { validateTorDocuments, type TorDocument } from "@/app/requests/tor/model";
import { createTorAttachments } from "@/app/requests/tor/pdf";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { LoanRequirement, loanRequirementOptions, steps } from "./constants";

export function usePol01Form() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [requestType, setRequestType] = useState<"purchase" | "hire">("purchase");
  const [title, setTitle] = useState("");
  const [rationale, setRationale] = useState("");
  const [requiredDate, setRequiredDate] = useState("");
  const [items, setItems] = useState<Pol01ItemInput[]>(() => pol01ItemExamples.map(emptyPol01Item));
  const [catalogOpen, setCatalogOpen] = useState(false);
  const catalogToggle = useRef<HTMLButtonElement>(null);
  const [fiscalYear, setFiscalYear] = useState("2569");
  const [fundSource, setFundSource] = useState("เงินงบประมาณแผ่นดิน");
  const [planName, setPlanName] = useState("แผนงานบริหารทั่วไป");
  const [expenseCategory, setExpenseCategory] = useState("ค่าวัสดุ");
  const [loanRequirement, setLoanRequirement] = useState<LoanRequirement | "">("");
  const [vendorSelection, setVendorSelection] = useState<VendorChoice>({ kind: "none" });
  const [newVendorName, setNewVendorName] = useState("");
  const [budgetDetailsOpen, setBudgetDetailsOpen] = useState(true);
  const [sourceCode, setSourceCode] = useState("2");
  const [departmentCode, setDepartmentCode] = useState("2301");
  const [fundCode, setFundCode] = useState("2");
  const [activityCode, setActivityCode] = useState("100210230004");
  const [approvalDetails, setApprovalDetails] = useState(createDefaultPol01ApprovalDetails);
  const [attachments, setAttachments] = useState<SelectedAttachment[]>([]);
  const [documentChecklist, setDocumentChecklist] = useState(createPol01Checklist);
  const [torDocuments, setTorDocuments] = useState<TorDocument[]>([]);
  const [draft, setDraft] = useState<{ id: string; requestNo: string } | null>(null);
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (pol01ItemAmount(item) ?? 0), 0),
    [items],
  );
  const selectedLoanLabel =
    loanRequirementOptions.find((option) => option.value === loanRequirement)?.label ??
    "ยังไม่ได้เลือก";
  const selectedVendorName =
    vendorSelection.kind === "new"
      ? newVendorName.trim() || "ผู้ประกอบการรายใหม่"
      : vendorSelection.kind === "registered"
        ? vendorSelection.vendorName
        : "ไม่ได้ระบุ";
  const budgetCodesComplete = Boolean(
    sourceCode.trim() && departmentCode.trim() && fundCode.trim() && activityCode.trim(),
  );
  const approvalDetailsComplete = Boolean(
    approvalDetails.requester.name.trim() &&
    approvalDetails.requester.position.trim() &&
    approvalDetails.committee[0].name.trim() &&
    approvalDetails.endorser.name.trim() &&
    approvalDetails.endorser.position.trim() &&
    approvalDetails.approver.name.trim() &&
    approvalDetails.approver.position.trim(),
  );
  const vendorErrorMessage = error.includes("ผู้ประกอบการ") ? error : undefined;
  const requiredAttachmentCount = Number(vendorSelection.kind === "new");
  const checklistContext = {
    newVendor: vendorSelection.kind === "new",
    borrowing: loanRequirement === "borrow_before_purchase",
  };

  function updateItem(index: number, patch: Partial<Pol01ItemInput>) {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  }

  function validateCurrentStep() {
    if (step === 0 && (!title.trim() || !rationale.trim() || !requiredDate)) {
      return "กรุณากรอกชื่อคำขอ เหตุผลความจำเป็น และวันที่ต้องการใช้";
    }
    if (step === 1 && !pol01ItemsPayload(items)) {
      return "กรุณากรอกรายการ จำนวน หน่วยนับ และราคาต่อหน่วยให้ครบอย่างน้อย 1 รายการ ลบแถวที่ไม่ใช้ และตรวจสอบว่าราคาไม่ติดลบ";
    }
    if (step === 2 && (!fiscalYear || !fundSource || !planName.trim() || !expenseCategory)) {
      return "กรุณาระบุข้อมูลงบประมาณให้ครบถ้วน";
    }
    if (step === 2 && !loanRequirement) {
      return "กรุณาเลือกความต้องการยืมเงินก่อนดำเนินการต่อ";
    }
    if (
      step === 2 &&
      loanRequirement === "faculty_direct_pay_credit_vendor" &&
      vendorSelection.kind === "none"
    ) {
      return "กรุณาเลือกผู้ประกอบการหรือร้านค้าสำหรับกรณีจ่ายตรงกับร้านค้า";
    }
    if (step === 2 && vendorSelection.kind === "new" && !newVendorName.trim()) {
      return "กรุณาระบุชื่อผู้ประกอบการหรือร้านค้ารายใหม่";
    }
    if (step === 2 && !budgetCodesComplete) {
      setBudgetDetailsOpen(true);
      return "กรุณากรอกรหัสแหล่งเงิน รหัสหน่วยงาน รหัสกองทุน และรหัสกิจกรรมให้ครบถ้วน";
    }
    if (step === 2 && !approvalDetailsComplete) {
      return "กรุณาตรวจสอบข้อมูลผู้ขอซื้อ/จ้าง ประธานผู้ตรวจรับ ผู้เห็นชอบ และผู้อนุมัติให้ครบถ้วน";
    }
    if (step === 3 && attachments.length < requiredAttachmentCount) {
      return `กรุณาแนบเอกสารที่กำหนดอย่างน้อย ${requiredAttachmentCount} ไฟล์`;
    }
    return "";
  }

  function goNext() {
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setError("");
    setStep((current) => Math.min(current + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSubmit() {
    const submittedItems = pol01ItemsPayload(items);
    if (!submittedItems) {
      setError("กรุณาตรวจสอบข้อมูลรายการพัสดุและลบแถวที่ไม่ใช้ก่อนส่งคำขอ");
      setStep(1);
      return;
    }
    setError("");
    setSubmissionMessage("กำลังจัดเตรียมฉบับร่าง...");
    startTransition(async () => {
      let generated: SelectedAttachment[];
      try {
        const torError = validateTorDocuments(torDocuments, documentChecklist.categories);
        if (torError) throw new Error(torError);
        setSubmissionMessage("กำลังสร้าง PDF TOR จากข้อมูลล่าสุด…");
        generated = await createTorAttachments(torDocuments);
        const attachmentError = validateAttachmentCandidates(
          [...attachments, ...generated].map((a) => a.file),
        );
        if (attachmentError) throw new Error(attachmentError);
      } catch (e) {
        setError(e instanceof Error ? e.message : "สร้าง TOR ไม่สำเร็จ กรุณาลองใหม่");
        setSubmissionMessage("");
        return;
      }
      let activeDraft = draft;
      if (!activeDraft) {
        const result = await createRequestDraft({
          kind: requestType,
          title,
          rationale,
          requiredDate,
          budgetYear: Number(fiscalYear),
          fundSource,
          planName,
          expenseCategory,
          formData: {
            advanceFundingOption: loanRequirement,
            requiresLoanAgreement: false,
            vendor:
              vendorSelection.kind !== "none"
                ? {
                    type: vendorSelection.kind,
                    id: vendorSelection.kind === "registered" ? vendorSelection.vendorId : null,
                    name: vendorSelection.kind === "new" ? newVendorName.trim() : null,
                  }
                : null,
            requiresVendorDocuments: vendorSelection.kind === "new",
            approvalDetails,
            documentChecklist: reconcilePol01Checklist(documentChecklist, checklistContext),
            torDocuments,
            budgetCodes: {
              sourceCode: sourceCode.trim(),
              departmentCode: departmentCode.trim(),
              fundCode: fundCode.trim(),
              activityCode: activityCode.trim(),
            },
          },
          items: submittedItems,
        });

        if (result.error || !result.requestId || !result.requestNo) {
          setError(result.error ?? "ไม่สามารถสร้างฉบับร่างได้ กรุณาลองใหม่");
          setSubmissionMessage("");
          return;
        }
        activeDraft = { id: result.requestId, requestNo: result.requestNo };
        setDraft(activeDraft);
      }

      setSubmissionMessage(
        attachments.length > 0
          ? `กำลังอัปโหลดเอกสาร 0/${attachments.length} ไฟล์...`
          : "กำลังส่งคำขอ...",
      );
      const uploadResult = await uploadRequestAttachments(
        activeDraft.id,
        [...attachments, ...generated],
        ({ completed, total, currentFileName }) =>
          setSubmissionMessage(
            currentFileName
              ? `กำลังอัปโหลด ${completed + 1}/${total}: ${currentFileName}`
              : `อัปโหลดเอกสารครบ ${completed}/${total} ไฟล์แล้ว`,
          ),
      );
      if (uploadResult.error) {
        setError(uploadResult.error);
        setSubmissionMessage("");
        return;
      }

      setSubmissionMessage("กำลังส่งคำขอเข้าสู่สายอนุมัติ...");
      const submitResult = await submitRequestDraft(activeDraft.id);
      if (submitResult.error || !submitResult.requestNo) {
        setError(submitResult.error ?? "ไม่สามารถส่งคำขอได้ กรุณาลองใหม่");
        setSubmissionMessage("");
        return;
      }

      router.push(`/requests/${submitResult.requestNo}`);
      router.refresh();
    });
  }
  return {
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
  };
}
export type Pol01FormController = ReturnType<typeof usePol01Form>;
