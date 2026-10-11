import { type SelectedAttachment } from "@/app/lib/request-attachments";
import { uploadRequestAttachments } from "@/app/lib/request-attachments.client";
import { resubmitReturnedRequest, updateReturnedRequest } from "@/app/requests/[id]/edit/actions";
import type { ReturnedStandardRequestEditData } from "@/app/requests/[id]/edit/types";
import {
  pol01ItemAmount,
  pol01ItemsPayload,
  type Pol01ItemInput,
} from "@/app/requests/new/item-input";
import { type VendorChoice } from "@/app/requests/new/vendor-picker";
import { reconcilePol01Checklist } from "@/app/requests/pol01-checklist";
import { syncTorAttachments } from "@/app/requests/tor/attachments";
import { validateTorDocuments } from "@/app/requests/tor/model";
import { createTorAttachments } from "@/app/requests/tor/pdf";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";

export function useReturnedRequestForm(initial: ReturnedStandardRequestEditData) {
  const router = useRouter();
  const [kind, setKind] = useState(initial.kind);
  const [title, setTitle] = useState(initial.title);
  const [rationale, setRationale] = useState(initial.rationale);
  const [requiredDate, setRequiredDate] = useState(initial.requiredDate);
  const [budgetYear, setBudgetYear] = useState(String(initial.budgetYear));
  const [fundSource, setFundSource] = useState(initial.fundSource);
  const [planName, setPlanName] = useState(initial.planName);
  const [expenseCategory, setExpenseCategory] = useState(initial.expenseCategory);
  const [loanRequirement, setLoanRequirement] = useState(initial.advanceFundingOption);
  const [sourceCode, setSourceCode] = useState(initial.sourceCode);
  const [departmentCode, setDepartmentCode] = useState(initial.departmentCode);
  const [fundCode, setFundCode] = useState(initial.fundCode);
  const [activityCode, setActivityCode] = useState(initial.activityCode);
  const [approvalDetails, setApprovalDetails] = useState(initial.approvalDetails);
  const [documentChecklist, setDocumentChecklist] = useState(initial.documentChecklist);
  const [torDocuments, setTorDocuments] = useState(initial.torDocuments ?? []);
  const [items, setItems] = useState<Pol01ItemInput[]>(() =>
    initial.items.map((item) => ({
      ...item,
      marketPrice: item.marketPrice ?? null,
      priceSource: item.priceSource ?? "",
    })),
  );
  const [newAttachments, setNewAttachments] = useState<SelectedAttachment[]>([]);
  const [vendorSelection, setVendorSelection] = useState<VendorChoice>(
    initial.vendor.kind === "registered"
      ? {
          kind: "registered",
          vendorId: initial.vendor.vendorId,
          vendorName: initial.vendor.vendorName,
        }
      : initial.vendor.kind === "new"
        ? { kind: "new" }
        : { kind: "none" },
  );
  const [newVendorName, setNewVendorName] = useState(
    initial.vendor.kind === "new" ? initial.vendor.vendorName : "",
  );
  const [error, setError] = useState("");
  const [progressMessage, setProgressMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const total = useMemo(
    () => items.reduce((sum, item) => sum + (pol01ItemAmount(item) ?? 0), 0),
    [items],
  );
  const requiredAttachmentCount = Number(vendorSelection.kind === "new");
  const totalAttachmentCount = initial.attachments.length + newAttachments.length;
  const checklistContext = {
    newVendor: vendorSelection.kind === "new",
    borrowing: loanRequirement === "borrow_before_purchase",
  };

  function updateItem(index: number, patch: Partial<Pol01ItemInput>) {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)),
    );
  }

  function validate() {
    const torError = validateTorDocuments(torDocuments, documentChecklist.categories);
    if (torError) return torError;
    if (!title.trim() || !rationale.trim() || !requiredDate) {
      return "กรุณากรอกชื่อคำขอ เหตุผลความจำเป็น และวันที่ต้องการใช้ให้ครบ";
    }
    if (requiredDate < new Date().toISOString().slice(0, 10)) {
      return "วันที่ต้องการใช้ต้องเป็นวันนี้หรือวันถัดไป";
    }
    if (!pol01ItemsPayload(items)) {
      return "กรุณาตรวจสอบรายการ จำนวน หน่วยนับ และราคาต่อหน่วยให้ครบ ลบแถวที่ไม่ใช้ และตรวจสอบว่าราคาไม่ติดลบ";
    }
    if (!sourceCode.trim() || !departmentCode.trim() || !fundCode.trim() || !activityCode.trim()) {
      return "กรุณากรอกรหัสแหล่งเงิน รหัสหน่วยงาน รหัสกองทุน และรหัสกิจกรรมให้ครบถ้วน";
    }
    if (
      !approvalDetails.requester.name.trim() ||
      !approvalDetails.requester.position.trim() ||
      !approvalDetails.committee[0].name.trim() ||
      !approvalDetails.endorser.name.trim() ||
      !approvalDetails.endorser.position.trim() ||
      !approvalDetails.approver.name.trim() ||
      !approvalDetails.approver.position.trim()
    ) {
      return "กรุณาตรวจสอบข้อมูลผู้ขอซื้อ/จ้าง ประธานผู้ตรวจรับ ผู้เห็นชอบ และผู้อนุมัติให้ครบถ้วน";
    }
    if (loanRequirement === "faculty_direct_pay_credit_vendor" && vendorSelection.kind === "none") {
      return "กรุณาเลือกผู้ประกอบการสำหรับกรณีจ่ายตรงกับร้านค้า";
    }
    if (vendorSelection.kind === "new" && !newVendorName.trim()) {
      return "กรุณาระบุชื่อผู้ประกอบการรายใหม่";
    }
    if (totalAttachmentCount < requiredAttachmentCount) {
      return `กรุณาแนบเอกสารที่กำหนดอย่างน้อย ${requiredAttachmentCount} ไฟล์`;
    }
    if (totalAttachmentCount > 10) return "เอกสารแนบรวมต้องไม่เกิน 10 ไฟล์";
    return "";
  }

  function handleResubmit() {
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    setError("");
    setProgressMessage("กำลังบันทึกการแก้ไข...");
    startTransition(async () => {
      let generated: SelectedAttachment[];
      try {
        generated = await createTorAttachments(torDocuments);
      } catch (e) {
        setError(e instanceof Error ? e.message : "สร้าง TOR ไม่สำเร็จ");
        setProgressMessage("");
        return;
      }
      const updateResult = await updateReturnedRequest(initial.id, {
        kind,
        title,
        rationale,
        requiredDate,
        budgetYear: Number(budgetYear),
        fundSource,
        planName,
        expenseCategory,
        formData: {
          advanceFundingOption: loanRequirement,
          requiresLoanAgreement: false,
          vendor:
            vendorSelection.kind === "registered"
              ? {
                  type: "registered",
                  id: vendorSelection.vendorId,
                  name: vendorSelection.vendorName,
                }
              : vendorSelection.kind === "new"
                ? { type: "new", id: null, name: newVendorName.trim() }
                : null,
          requiresVendorDocuments: vendorSelection.kind === "new",
          approvalDetails,
          documentChecklist: reconcilePol01Checklist(documentChecklist, checklistContext),
          torDocuments,
          removedTorAttachmentIds: [
            ...new Set([
              ...(initial.removedTorAttachmentIds ?? []),
              ...(initial.torDocuments ?? []).map((d) => d.attachmentId),
            ]),
          ].filter((id) => !torDocuments.some((d) => d.attachmentId === id)),
          budgetCodes: {
            sourceCode: sourceCode.trim(),
            departmentCode: departmentCode.trim(),
            fundCode: fundCode.trim(),
            activityCode: activityCode.trim(),
          },
        },
        items: pol01ItemsPayload(items)!,
      });
      if (updateResult.error) {
        setError(updateResult.error);
        setProgressMessage("");
        return;
      }

      if (newAttachments.length > 0) setProgressMessage("กำลังอัปโหลดเอกสารเพิ่มเติม...");
      const uploadResult = await uploadRequestAttachments(
        initial.id,
        newAttachments,
        ({ completed, total: uploadTotal, currentFileName }) =>
          setProgressMessage(
            currentFileName
              ? `กำลังอัปโหลด ${completed + 1}/${uploadTotal}: ${currentFileName}`
              : `อัปโหลดเอกสารครบ ${completed}/${uploadTotal} ไฟล์แล้ว`,
          ),
        { preserveExisting: true },
      );
      if (uploadResult.error) {
        setError(uploadResult.error);
        setProgressMessage("");
        return;
      }

      const torResult = await syncTorAttachments(initial.id, generated, [
        ...new Set([
          ...(initial.removedTorAttachmentIds ?? []),
          ...(initial.torDocuments ?? []).map((d) => d.attachmentId),
        ]),
      ]);
      if (torResult.error) {
        setError(torResult.error);
        setProgressMessage("");
        return;
      }
      setProgressMessage("กำลังส่งคำขอกลับเข้าสู่สายอนุมัติ...");
      const resubmitResult = await resubmitReturnedRequest(initial.id);
      if (resubmitResult.error || !resubmitResult.requestNo) {
        setError(resubmitResult.error ?? "ไม่สามารถส่งคำขอได้ กรุณาลองใหม่");
        setProgressMessage("");
        return;
      }

      router.push(`/requests/${resubmitResult.requestNo}`);
      router.refresh();
    });
  }
  return {
    initial,
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
  };
}
export type ReturnedRequestFormController = ReturnType<typeof useReturnedRequestForm>;
