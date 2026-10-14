import { type SelectedAttachment } from "@/app/lib/request-attachments";
import { uploadRequestAttachments } from "@/app/lib/request-attachments.client";
import { resubmitReturnedRequest, updateReturnedRequest } from "@/app/requests/[id]/edit/actions";
import { removeReturnedW119Attachments } from "@/app/requests/[id]/edit/attachment-actions";
import type { ReturnedW119RequestEditData } from "@/app/requests/[id]/edit/types";
import { createRequestDraft, submitRequestDraft } from "@/app/requests/new/actions";
import type { NewRequestInput } from "@/app/requests/new/schemas";
import {
  emptyW119Item,
  isCompleteW119Item,
  w119ItemAmount,
  type W119ItemInput as RequestItem,
} from "@/app/requests/w119/item-input";
import { emptyLoanAgreement, loanAgreementSchema } from "@/app/requests/w119/loan-agreement";
import { validateW119Submission } from "@/app/requests/w119/validation";
import { toW119PrintData, type W119PrintData } from "@/app/requests/w119/w119-print-data";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { itemExamples, steps } from "./constants";
import { w119Defaults } from "./defaults";

export function useW119Form(initial?: ReturnedW119RequestEditData) {
  const router = useRouter();
  const submittingRef = useRef(false);
  const [existingAttachments, setExistingAttachments] = useState(initial?.attachments ?? []);
  const [pendingRemovalIds, setPendingRemovalIds] = useState<string[]>([]);
  const retainedAttachments = existingAttachments.filter(
    (file) => !pendingRemovalIds.includes(file.id),
  );
  const pendingRemovalAttachments = existingAttachments.filter((file) =>
    pendingRemovalIds.includes(file.id),
  );
  const form = initial?.formData;
  const previewButtonRef = useRef<HTMLButtonElement>(null);
  const [previewData, setPreviewData] = useState<W119PrintData | null>(null);
  const [step, setStep] = useState(0);
  const [requestType, setRequestType] = useState<"purchase" | "hire">(initial?.kind ?? "purchase");
  const [documentNo, setDocumentNo] = useState(form?.documentNo ?? w119Defaults.documentNo);
  const [memoDate, setMemoDate] = useState(form?.memoDate ?? "");
  const [departmentName, setDepartmentName] = useState(
    form?.departmentName ?? w119Defaults.departmentName,
  );
  const [phone, setPhone] = useState(form?.phone ?? w119Defaults.phone);
  const [addressee, setAddressee] = useState(form?.addressee ?? w119Defaults.addressee);
  const [title, setTitle] = useState(initial?.title ?? "");
  const [rationale, setRationale] = useState(initial?.rationale ?? "");
  const [requiredDate, setRequiredDate] = useState(initial?.requiredDate ?? "");
  const [items, setItems] = useState<RequestItem[]>(
    () => initial?.items ?? itemExamples.map(() => emptyW119Item()),
  );
  const [fiscalYear, setFiscalYear] = useState(
    String(initial?.budgetYear ?? w119Defaults.fiscalYear),
  );
  const [fundSource, setFundSource] = useState(initial?.fundSource ?? w119Defaults.fundSource);
  const [planName, setPlanName] = useState(initial?.planName ?? "");
  const [expenseCategory, setExpenseCategory] = useState(
    initial?.expenseCategory ?? w119Defaults.expenseCategory,
  );
  const [sourceCode, setSourceCode] = useState(form?.budgetCodes.sourceCode ?? "");
  const [departmentCode, setDepartmentCode] = useState(form?.budgetCodes.departmentCode ?? "");
  const [fundCode, setFundCode] = useState(form?.budgetCodes.fundCode ?? "");
  const [planCode, setPlanCode] = useState(form?.budgetCodes.planCode ?? "");
  const [subprojectCode, setSubprojectCode] = useState(form?.budgetCodes.subprojectCode ?? "");
  const [activityCode, setActivityCode] = useState(form?.budgetCodes.activityCode ?? "");
  const [selectionCriteria, setSelectionCriteria] = useState(
    form?.selectionCriteria ?? "เกณฑ์ราคา",
  );
  const [advanceRequired, setAdvanceRequired] = useState(form?.advanceRequired ?? false);
  const [loanAgreement, setLoanAgreement] = useState(form?.loanAgreement ?? emptyLoanAgreement());
  const [attachments, setAttachments] = useState<SelectedAttachment[]>([]);
  const [draft, setDraft] = useState<{ id: string; requestNo: string } | null>(null);
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const attachmentCount = retainedAttachments.length + attachments.length;

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (w119ItemAmount(item) ?? 0), 0),
    [items],
  );
  const hasAllAmounts = items.length > 0 && items.every((item) => w119ItemAmount(item) !== null);

  function updateItem(index: number, patch: Partial<RequestItem>) {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  }

  function validateCurrentStep() {
    if (
      step === 0 &&
      (!documentNo.trim() ||
        !memoDate ||
        !departmentName.trim() ||
        !phone.trim() ||
        !addressee.trim() ||
        !title.trim() ||
        !rationale.trim() ||
        !requiredDate)
    ) {
      return "กรุณากรอกข้อมูลบันทึกข้อความ เหตุผลความจำเป็น และวันที่ต้องการใช้ให้ครบถ้วน";
    }
    if (step === 1 && (items.length === 0 || !items.every(isCompleteW119Item))) {
      return "กรุณากรอกรายการ จำนวน หน่วย ราคา ราคากลาง และแหล่งที่มาของราคาให้ครบถ้วน";
    }
    if (
      step === 2 &&
      (!fiscalYear ||
        !fundSource ||
        !planName.trim() ||
        !expenseCategory ||
        !sourceCode ||
        !departmentCode ||
        !fundCode ||
        !planCode ||
        !subprojectCode ||
        !activityCode)
    ) {
      return "กรุณาระบุข้อมูลงบประมาณให้ครบถ้วน";
    }
    if (step === 3 && advanceRequired) {
      const loan = loanAgreementSchema.safeParse(loanAgreement);
      if (!loan.success) return loan.error.issues[0].message;
      if (total <= 0) return "ยอดขอยืมเงินต้องมากกว่า 0 บาท กรุณาตรวจสอบรายการพัสดุ";
    }
    if (step === 3 && attachmentCount === 0) {
      return "กรุณาแนบใบเสนอราคา รายละเอียดคุณลักษณะ หรือหลักฐานราคาอย่างน้อย 1 ไฟล์";
    }
    return "";
  }

  function goNext() {
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setStep((current) => Math.min(current + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSubmit() {
    if (submittingRef.current) return;
    if (items.length === 0 || !items.every(isCompleteW119Item)) {
      setError("กรุณากรอกรายการ จำนวน หน่วย ราคา ราคากลาง และแหล่งที่มาของราคาให้ครบถ้วน");
      setStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    const input: NewRequestInput = {
      kind: requestType,
      title,
      rationale,
      requiredDate,
      budgetYear: Number(fiscalYear),
      fundSource,
      planName,
      expenseCategory,
      formData: {
        regulation:
          form?.regulation ?? "หนังสือ ด่วนที่สุด ที่ กค (กวจ) 0405.2/ว119 ลงวันที่ 7 มีนาคม 2561",
        documentNo,
        memoDate,
        departmentName,
        phone,
        addressee,
        selectionCriteria,
        advanceRequired,
        ...(advanceRequired ? { loanAgreement } : {}),
        budgetCodes: {
          sourceCode,
          departmentCode,
          fundCode,
          planCode,
          subprojectCode,
          activityCode,
        },
        requiresItemAttachment: items.length > 10,
      },
      items: items.map((item, index) => ({
        line_no: index + 1,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unitPrice,
        market_price: item.marketPrice ?? undefined,
        price_source: item.priceSource,
      })),
    };
    const validation = validateW119Submission(
      input,
      attachmentCount,
      retainedAttachments.reduce((sum, item) => sum + item.sizeBytes, 0) +
        attachments.reduce((sum, item) => sum + item.file.size, 0),
    );
    if (validation) {
      setError(validation.message);
      setStep(validation.step);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    submittingRef.current = true;
    setError("");
    setSubmissionMessage(initial ? "กำลังบันทึกการแก้ไขคำขอเดิม..." : "กำลังจัดเตรียมฉบับร่าง...");
    startTransition(async () => {
      try {
        let activeDraft = initial ? { id: initial.id, requestNo: initial.requestNo } : draft;
        if (initial) {
          const result = await updateReturnedRequest(initial.id, input);
          if (result.error) {
            setError(result.error);
            return;
          }
        } else if (!activeDraft) {
          const result = await createRequestDraft(input);

          if (result.error || !result.requestId || !result.requestNo) {
            setError(result.error ?? "ไม่สามารถสร้างฉบับร่างได้ กรุณาลองใหม่");
            setSubmissionMessage("");
            return;
          }
          activeDraft = { id: result.requestId, requestNo: result.requestNo };
          setDraft(activeDraft);
        }

        if (!activeDraft) return;

        setSubmissionMessage(`กำลังอัปโหลดเอกสาร 0/${attachments.length} ไฟล์...`);
        const uploadResult = await uploadRequestAttachments(
          activeDraft.id,
          attachments,
          ({ completed, total, currentFileName }) =>
            setSubmissionMessage(
              currentFileName
                ? `กำลังอัปโหลด ${completed + 1}/${total}: ${currentFileName}`
                : `อัปโหลดเอกสารครบ ${completed}/${total} ไฟล์แล้ว`,
            ),
          { preserveExisting: Boolean(initial) },
        );
        if (uploadResult.error) {
          setError(
            initial
              ? "บันทึกการแก้ไขแล้ว แต่อัปโหลดเอกสารเพิ่มไม่สำเร็จ คำขอยังไม่ได้ส่งใหม่ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองอีกครั้ง"
              : uploadResult.error,
          );
          setSubmissionMessage("");
          return;
        }

        if (initial && pendingRemovalIds.length > 0) {
          setSubmissionMessage("กำลังลบเอกสารที่เลือกออกจากคำขอ...");
          const removal = await removeReturnedW119Attachments(initial.id, pendingRemovalIds);
          // Reflect confirmed removals even if a later deletion/resubmission fails.
          setExistingAttachments((current) =>
            current.filter((file) => !removal.removedIds.includes(file.id)),
          );
          setPendingRemovalIds((current) =>
            current.filter((id) => !removal.removedIds.includes(id)),
          );
          if (removal.error || removal.warning) {
            setError(removal.error ?? removal.warning ?? "ลบเอกสารไม่สำเร็จ");
            return;
          }
        }

        setSubmissionMessage("กำลังส่งคำขอเข้าสู่สายอนุมัติ...");
        const submitResult = initial
          ? await resubmitReturnedRequest(activeDraft.id)
          : await submitRequestDraft(activeDraft.id);
        if (submitResult.error || !submitResult.requestNo) {
          setError(submitResult.error ?? "ไม่สามารถส่งคำขอได้ กรุณาลองใหม่");
          setSubmissionMessage("");
          return;
        }

        router.push(`/requests/${submitResult.requestNo}`);
        router.refresh();
      } catch {
        setError(
          "การเชื่อมต่อขัดข้อง กรุณาตรวจสอบสถานะคำขอในหน้ารายละเอียดก่อนลองส่งอีกครั้ง ข้อมูลที่กรอกยังอยู่ในหน้านี้",
        );
      } finally {
        submittingRef.current = false;
        setSubmissionMessage("");
      }
    });
  }

  function openPreview() {
    setPreviewData(
      toW119PrintData({
        // Use only a number already assigned by the database. Unsaved previews
        // stay unnumbered; editing never allocates another sequence value.
        request_no: initial?.requestNo ?? draft?.requestNo ?? "",
        title,
        rationale,
        required_date: requiredDate,
        estimated_amount: total,
        form_data: {
          documentNo,
          memoDate,
          departmentName,
          phone,
          addressee,
          advanceRequired,
          ...(advanceRequired ? { loanAgreement } : {}),
          budgetCodes: {
            sourceCode,
            departmentCode,
            fundCode,
            planCode,
            subprojectCode,
            activityCode,
          },
        },
        request_items: items.map((item, index) => ({
          line_no: index + 1,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unitPrice,
          total_amount: w119ItemAmount(item) ?? 0,
        })),
      }),
    );
  }
  return {
    previewData,
    attachments,
    setPreviewData,
    previewButtonRef,
    initial,
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
  };
}
export type W119FormController = ReturnType<typeof useW119Form>;
