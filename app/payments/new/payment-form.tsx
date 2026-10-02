"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle } from "lucide-react";
import { uploadPaymentAttachments } from "@/app/lib/payment-attachments.client";
import type { SelectedAttachment } from "@/app/lib/request-attachments";
import { Button } from "../../components/ui";
import { createPaymentDraft, submitPaymentDraft } from "./actions";
import { PaymentDocumentsSection } from "./payment-documents-section";
import { PaymentItemsSection } from "./payment-items-section";
import { PaymentReferenceSection } from "./payment-reference-section";
import { PaymentSummary } from "./payment-summary";
import { createPaymentDetails, createPaymentLines, paymentLineAmount } from "./pol02";
import type { PaymentDetails, PaymentLine, SourceRequest } from "./types";

export function PaymentForm({ requests }: { requests: SourceRequest[] }) {
  const router = useRouter();
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [requestId, setRequestId] = useState(requests[0]?.id ?? "");
  const initialRequest = requests[0];
  const [details, setDetails] = useState<PaymentDetails>(() =>
    initialRequest ? createPaymentDetails(initialRequest) : ({} as PaymentDetails),
  );
  const [lines, setLines] = useState<PaymentLine[]>(() =>
    initialRequest ? createPaymentLines(initialRequest) : [],
  );
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [files, setFiles] = useState<SelectedAttachment[]>([]);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [pending, startTransition] = useTransition();
  const request = useMemo(
    () => requests.find((item) => item.id === requestId) ?? requests[0],
    [requests, requestId],
  );
  const subtotal = lines.reduce((sum, line) => sum + paymentLineAmount(line), 0);
  const total = subtotal + (Number(details.vat) || 0);
  const remaining = request ? request.approved - request.paid : 0;
  const over = total > remaining;

  function changeRequest(nextRequestId: string) {
    const nextRequest = requests.find((item) => item.id === nextRequestId);
    if (!nextRequest) return;
    setRequestId(nextRequestId);
    setDetails(createPaymentDetails(nextRequest));
    setLines(createPaymentLines(nextRequest));
    setSelectedDocuments([]);
    setFiles([]);
    setError("");
  }

  function validate() {
    if (
      !request ||
      !details.subject.trim() ||
      !details.approvalDate ||
      !details.procurementMethod ||
      !details.vendorName.trim() ||
      !details.invoiceNo.trim() ||
      !details.invoiceDate ||
      !details.delivery.trim()
    ) {
      return "กรุณากรอกข้อมูลที่มีเครื่องหมาย * ให้ครบถ้วน";
    }
    if (
      lines.some(
        (line) =>
          !line.description.trim() || Number(line.quantity) <= 0 || Number(line.unitPrice) < 0,
      )
    ) {
      return "กรุณาตรวจสอบรายการ จำนวน และราคาต่อหน่วยให้ครบถ้วน";
    }
    if (total <= 0) return "ยอดขอเบิกต้องมากกว่า 0 บาท";
    if (over) return "ยอดขอเบิกจ่ายสูงกว่าวงเงินคงเหลือ";
    if (Number(details.contractAmount) < total) return "ยอดขอเบิกสูงกว่าวงเงินตามสัญญา";
    if (Number(details.installmentNumber) > Number(details.installmentCount)) {
      return "งวดที่ขอเบิกต้องไม่เกินจำนวนงวดทั้งหมด";
    }
    if (selectedDocuments.length === 0) {
      return "กรุณาเลือกรายการเอกสารประกอบอย่างน้อย 1 รายการ";
    }
    if (files.length === 0) return "กรุณาแนบเอกสารประกอบอย่างน้อย 1 ไฟล์";
    return null;
  }

  function submit() {
    setError("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    startTransition(async () => {
      setProgress("กำลังสร้างฉบับร่าง POL02...");
      const draft = await createPaymentDraft({
        requestId,
        idempotencyKey,
        invoiceNo: details.invoiceNo,
        invoiceDate: details.invoiceDate,
        subtotal,
        vat: Number(details.vat) || 0,
        delivery: details.delivery,
        formData: {
          formType: "pol02",
          formVersion: 1,
          approvalDate: details.approvalDate,
          departmentName: request.departmentName,
          requesterName: request.requesterName,
          subject: details.subject,
          projectActivity: details.projectActivity,
          budgetYear: request.budgetYear,
          fundSource: request.fundSource,
          departmentCode: request.departmentCode,
          fundCode: request.fundCode,
          activityCode: request.activityCode,
          expenseCategory: request.expenseCategory,
          procurementMethod: details.procurementMethod,
          egpProjectNo: details.egpProjectNo,
          contractNo: details.contractNo,
          contractDate: details.contractDate,
          vendorName: details.vendorName,
          vendorTaxId: details.vendorTaxId,
          contractAmount: Number(details.contractAmount),
          installmentNumber: Number(details.installmentNumber),
          installmentCount: Number(details.installmentCount),
          documentChecklist: selectedDocuments,
        },
        items: lines.map((line, index) => ({
          lineNo: index + 1,
          description: line.description,
          attachmentType: line.attachmentType,
          documentNo: line.documentNo,
          quantity: Number(line.quantity),
          unitPrice: Number(line.unitPrice),
        })),
      });
      if (draft.error || !draft.paymentId) {
        setError(draft.error ?? "ไม่สามารถสร้างฉบับร่างคำขอเบิกจ่ายได้");
        setProgress("");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const upload = await uploadPaymentAttachments(draft.paymentId, files, (state) => {
        setProgress(
          state.currentFileName
            ? `กำลังอัปโหลด ${state.completed + 1}/${state.total}: ${state.currentFileName}`
            : "อัปโหลดเอกสารครบแล้ว กำลังส่งเข้าสายอนุมัติ...",
        );
      });
      if (upload.error) {
        setError(`${upload.error}${draft.paymentNo ? ` เลขที่ฉบับร่าง ${draft.paymentNo}` : ""}`);
        setProgress("");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      const submitted = await submitPaymentDraft(draft.paymentId);
      if (submitted.error) {
        setError(submitted.error);
        setProgress("");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }

      setProgress("ส่งคำขอเรียบร้อย");
      router.push("/requests");
      router.refresh();
    });
  }

  if (!requests.length || !request) {
    return (
      <div className="mt-6 border border-amber-300 bg-[var(--amber-soft)] p-6">
        <h2 className="font-bold text-[var(--amber)]">ยังไม่มีคำขอที่เบิกจ่ายได้</h2>
        <p className="mt-1 text-sm">
          คำขอต้องอยู่ในสถานะอนุมัติแล้ว สั่งซื้อ/จ้างแล้ว หรือเสร็จสิ้น
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
        className="min-w-0 border border-[var(--line-dark)] bg-[var(--paper)]"
      >
        <div className="border-b border-[var(--line)] bg-[var(--ink)] p-5 text-white">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[.12em] text-orange-200">
                POL02 · ใบขอเบิกจ่ายจัดซื้อจัดจ้าง
              </p>
              <h2 className="mt-1 text-xl font-bold">คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี</h2>
            </div>
            <span className="border border-white/30 px-3 py-1 text-xs font-semibold">
              ร่างแบบฟอร์มภายใน
            </span>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="m-5 border border-red-300 bg-[var(--red-soft)] p-4 font-semibold text-[var(--red)]"
          >
            {error}
          </div>
        )}
        {pending && progress && (
          <div
            role="status"
            aria-live="polite"
            className="m-5 flex items-center gap-3 border border-blue-300 bg-[var(--blue-soft)] p-4 text-[var(--blue)]"
          >
            <LoaderCircle className="animate-spin" size={19} aria-hidden="true" />
            <span className="font-semibold">{progress}</span>
          </div>
        )}

        <PaymentReferenceSection
          requests={requests}
          requestId={requestId}
          request={request}
          details={details}
          disabled={pending}
          onRequestChange={changeRequest}
          onDetailsChange={setDetails}
        />
        <PaymentItemsSection
          lines={lines}
          vat={details.vat}
          disabled={pending}
          onLinesChange={setLines}
          onVatChange={(vat) => setDetails({ ...details, vat })}
        />
        <PaymentDocumentsSection
          selectedDocuments={selectedDocuments}
          files={files}
          disabled={pending}
          onSelectedDocumentsChange={setSelectedDocuments}
          onFilesChange={setFiles}
        />

        <div className="flex flex-col gap-3 border-t border-[var(--line)] bg-stone-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-stone-500">
            เมื่อส่งแล้ว คำขอจะเข้าสู่ขั้นตอนเจ้าหน้าที่พัสดุตรวจสอบเอกสาร
          </p>
          <Button type="submit" disabled={pending || over} className="sm:min-w-52">
            {pending ? (
              <>
                <LoaderCircle className="animate-spin" size={17} aria-hidden="true" />
                กำลังดำเนินการ...
              </>
            ) : (
              <>
                <Check size={17} aria-hidden="true" />
                ยืนยันและส่งคำขอ
              </>
            )}
          </Button>
        </div>
      </form>
      <PaymentSummary request={request} total={total} />
    </div>
  );
}
