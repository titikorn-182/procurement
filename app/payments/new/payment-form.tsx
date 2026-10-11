"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, LoaderCircle, Printer } from "lucide-react";
import { uploadPaymentAttachments } from "@/app/lib/payment-attachments.client";
import {
  validateAttachmentCandidates,
  type SelectedAttachment,
} from "@/app/lib/request-attachments";
import type { PaymentEditData } from "./types";
import { Button } from "../../components/ui";
import { createPaymentDraft, submitPaymentDraft } from "./actions";
import { PaymentDocumentsSection } from "./payment-documents-section";
import { PaymentItemsSection } from "./payment-items-section";
import { PaymentReferenceSection } from "./payment-reference-section";
import { PaymentSummary } from "./payment-summary";
import { createPaymentDetails, createPaymentLines, paymentLineAmount } from "./pol02";
import type { PaymentDetails, PaymentLine, SourceRequest } from "./types";
import { PaymentPrintPreview } from "./payment-print-preview";
import { createPol02PrintData, type Pol02PrintData } from "./pol02-print-data";
import { createPol02Checklist, getPol02DocumentIds } from "./pol02-checklist";

export function PaymentForm({
  requests,
  printFontClassName,
  initial,
}: {
  requests: SourceRequest[];
  printFontClassName: string;
  initial?: PaymentEditData;
}) {
  const router = useRouter();
  const previewButtonRef = useRef<HTMLButtonElement>(null);
  const [previewData, setPreviewData] = useState<Pol02PrintData | null>(null);
  const [idempotencyKey] = useState(() => initial?.idempotencyKey ?? crypto.randomUUID());
  const [saved, setSaved] = useState<{ id: string; paymentNo: string; updatedAt: string } | null>(
    initial ? { id: initial.id, paymentNo: initial.paymentNo, updatedAt: initial.updatedAt } : null,
  );
  const [existing, setExisting] = useState(initial?.attachments ?? []);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const retained = existing.filter((file) => !removedIds.includes(file.id));
  const [requestId, setRequestId] = useState(requests[0]?.id ?? "");
  const initialRequest = requests[0];
  const [details, setDetails] = useState<PaymentDetails>(
    () =>
      initial?.details ??
      (initialRequest ? createPaymentDetails(initialRequest) : ({} as PaymentDetails)),
  );
  const [lines, setLines] = useState<PaymentLine[]>(
    () => initial?.lines ?? (initialRequest ? createPaymentLines(initialRequest) : []),
  );
  const [checklist, setChecklist] = useState(
    () =>
      initial?.checklist ??
      createPol02Checklist(initialRequest?.checklistCategories, initialRequest?.isNewVendor),
  );
  const selectedDocuments = getPol02DocumentIds(checklist);
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
    setChecklist(createPol02Checklist(nextRequest.checklistCategories, nextRequest.isNewVendor));
    setFiles([]);
    setError("");
  }

  function validate(saveOnly: boolean) {
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
    if (!saveOnly && files.length + retained.length === 0)
      return "กรุณาแนบเอกสารประกอบอย่างน้อย 1 ไฟล์";
    const attachmentError = validateAttachmentCandidates([
      ...retained.map((file) => ({
        name: file.file_name,
        size: file.size_bytes,
        type: file.mime_type,
      })),
      ...files.map(({ file }) => file),
    ]);
    if (attachmentError) return attachmentError;
    return null;
  }

  function submit(saveOnly = false) {
    setError("");
    const validationError = validate(saveOnly);
    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }

    startTransition(async () => {
      try {
        setProgress("กำลังบันทึกข้อมูล POL-02...");
        const draft = await createPaymentDraft(
          {
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
              supportingDocumentChecklist: checklist,
            },
            items: lines.map((line, index) => ({
              lineNo: index + 1,
              description: line.description,
              attachmentType: line.attachmentType,
              documentNo: line.documentNo,
              quantity: Number(line.quantity),
              unitPrice: Number(line.unitPrice),
            })),
          },
          saved
            ? { id: saved.id, updatedAt: saved.updatedAt, removedAttachmentIds: removedIds }
            : undefined,
        );
        if (draft.error || !draft.paymentId) {
          setError(draft.error ?? "ไม่สามารถสร้างฉบับร่างคำขอเบิกจ่ายได้");
          setProgress("");
          window.scrollTo({ top: 0, behavior: "smooth" });
          return;
        }
        if (!draft.paymentNo || !("updatedAt" in draft) || !draft.updatedAt) {
          setError(
            "บันทึกข้อมูลแล้ว แต่โหลดรุ่นข้อมูลไม่สำเร็จ กรุณาเปิดฉบับร่างจากเมนูคำขอเบิกจ่ายก่อนทำต่อ",
          );
          setProgress("");
          return;
        }
        setSaved({ id: draft.paymentId, paymentNo: draft.paymentNo, updatedAt: draft.updatedAt });
        setExisting(retained);
        setRemovedIds([]);

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
        if (saveOnly) {
          router.push(`/payments/${encodeURIComponent(draft.paymentNo)}`);
          router.refresh();
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
        router.push(`/payments/${encodeURIComponent(draft.paymentNo!)}`);
        router.refresh();
      } catch {
        setError(
          "การเชื่อมต่อขัดข้อง ข้อมูลที่กรอกยังอยู่ในหน้านี้ กรุณาลองใหม่ หรือเปิดฉบับร่างจากเมนูคำขอเบิกจ่าย",
        );
        setProgress("");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
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

  if (previewData) {
    return (
      <PaymentPrintPreview
        data={previewData}
        fontClassName={printFontClassName}
        attachments={files}
        savedAttachments={retained.map((file) => ({
          id: file.id,
          name: file.file_name,
          mimeType: file.mime_type,
          sizeBytes: file.size_bytes,
          scope: "payment",
        }))}
        onClose={() => {
          setPreviewData(null);
          requestAnimationFrame(() => previewButtonRef.current?.focus());
        }}
      />
    );
  }

  function openPreview() {
    setPreviewData(
      createPol02PrintData({
        request,
        details,
        lines,
        selectedDocuments,
        supportingDocumentChecklist: checklist,
        attachmentNames: [
          ...retained.map((file) => file.file_name),
          ...files.map(({ file }) => file.name),
        ],
      }),
    );
  }

  return (
    <div className="mt-6 grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <div className="flex flex-wrap items-center justify-between gap-3 xl:col-span-2">
        <p className="text-sm text-stone-600">
          ตรวจรูปแบบเอกสารก่อนส่งคำขอ โดยข้อมูลที่กรอกจะยังอยู่ครบ
        </p>
        <button
          ref={previewButtonRef}
          type="button"
          disabled={pending}
          onClick={openPreview}
          className="inline-flex min-h-10 items-center justify-center gap-2 border border-[var(--line-dark)] bg-white px-4 font-semibold hover:bg-[var(--paper-warm)] disabled:opacity-45"
        >
          <Printer size={17} aria-hidden="true" /> ดูตัวอย่าง / พิมพ์ / PDF
        </button>
      </div>
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
          sourceLocked={Boolean(saved)}
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
        {existing.length > 0 && (
          <section className="border-t p-5" aria-label="เอกสารแนบเดิม">
            <h3 className="font-bold">เอกสารแนบเดิม</h3>
            <p className="mt-1 text-sm text-stone-600">
              การนำออกจะมีผลเมื่อบันทึกข้อมูล และเก็บไฟล์ต้นฉบับไว้สำหรับตรวจสอบ
            </p>
            <ul className="mt-3 divide-y border">
              {existing.map((file) => (
                <li key={file.id} className="flex flex-wrap items-center justify-between gap-2 p-3">
                  <a
                    href={`/api/payment-attachments/${file.id}`}
                    className="min-w-0 break-all text-sm underline"
                  >
                    {file.file_name}
                  </a>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      setRemovedIds((ids) =>
                        ids.includes(file.id)
                          ? ids.filter((id) => id !== file.id)
                          : [...ids, file.id],
                      )
                    }
                    className="min-h-11 border px-3 text-sm font-semibold"
                  >
                    {removedIds.includes(file.id) ? "ยกเลิกการนำออก" : "นำออก"}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
        <PaymentDocumentsSection
          checklist={checklist}
          files={files}
          disabled={pending}
          onChecklistChange={setChecklist}
          onFilesChange={setFiles}
        />

        <div className="flex flex-col gap-3 border-t border-[var(--line)] bg-stone-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-stone-500">
            {initial?.status === "returned"
              ? `เมื่อส่งใหม่ คำขอจะกลับไปยังผู้ตรวจขั้นตอนที่ ${initial.currentStep} โดยเก็บประวัติเดิม`
              : "เมื่อส่งแล้ว คำขอจะเข้าสู่ขั้นตอนเจ้าหน้าที่พัสดุตรวจสอบเอกสาร"}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" disabled={pending || over} onClick={() => submit(true)}>
              บันทึกไว้ทำต่อ
            </Button>
            <Button variant="secondary" disabled={pending} onClick={openPreview}>
              <Printer size={17} aria-hidden="true" /> ดูตัวอย่าง / พิมพ์ / PDF
            </Button>
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
        </div>
      </form>
      <PaymentSummary request={request} total={total} />
    </div>
  );
}
