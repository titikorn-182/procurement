"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Info,
  Plus,
  Printer,
  Trash2,
} from "lucide-react";
import { AttachmentPicker } from "../../components/attachment-picker";
import { Button, PageHeader } from "../../components/ui";
import { uploadRequestAttachments } from "../../lib/request-attachments.client";
import { formatAttachmentSize, type SelectedAttachment } from "../../lib/request-attachments";
import { createRequestDraft, submitRequestDraft } from "../new/actions";
import { updateReturnedRequest, resubmitReturnedRequest } from "../[id]/edit/actions";
import { removeReturnedW119Attachments } from "../[id]/edit/attachment-actions";
import type { ReturnedW119RequestEditData } from "../[id]/edit/types";
import type { NewRequestInput } from "../new/schemas";
import { validateW119Submission } from "./validation";
import { W119PrintPreview } from "./w119-print-preview";
import { toW119PrintData, type W119PrintData } from "./w119-print-data";
import { emptyLoanAgreement, loanAgreementSchema } from "./loan-agreement";
import { LoanAgreementFields } from "./loan-agreement-fields";

type RequestItem = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  marketPrice: number | null;
  priceSource: string;
};

const steps = ["บันทึกข้อความ", "รายการพัสดุ", "งบประมาณ", "เอกสารแนบ", "ตรวจสอบและส่ง"];
const fiscalYears = ["2567", "2568", "2569", "2570", "2571", "2572"] as const;

const initialItems: RequestItem[] = [
  {
    description: "กระดาษถ่ายเอกสาร A4 80 แกรม",
    quantity: 10,
    unit: "รีม",
    unitPrice: 120,
    marketPrice: 120,
    priceSource: "ใบเสนอราคา",
  },
  {
    description: "แฟ้มสันกว้าง 3 นิ้ว",
    quantity: 20,
    unit: "เล่ม",
    unitPrice: 75,
    marketPrice: 75,
    priceSource: "ราคาตลาด",
  },
  {
    description: "ปากกาลูกลื่นสีน้ำเงิน",
    quantity: 50,
    unit: "ด้าม",
    unitPrice: 8,
    marketPrice: 8,
    priceSource: "ราคาที่เคยซื้อครั้งล่าสุด",
  },
];

const inputClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100";

function SectionCard({
  title,
  description,
  children,
  disabled = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <section className="border border-[var(--line-dark)] bg-[var(--paper)]">
      <header className="border-b border-[var(--line)] px-5 py-4">
        <h2 className="text-lg font-bold text-[var(--ink)]">{title}</h2>
        <p className="mt-1 text-sm text-stone-500">{description}</p>
      </header>
      <fieldset disabled={disabled} className="min-w-0 p-5 sm:p-6">
        {children}
      </fieldset>
    </section>
  );
}

function money(value: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(value);
}

export function W119Form({
  printFontClassName,
  initial,
}: {
  printFontClassName: string;
  initial?: ReturnedW119RequestEditData;
}) {
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
  const [documentNo, setDocumentNo] = useState(form?.documentNo ?? "อว 0604.19/");
  const [memoDate, setMemoDate] = useState(form?.memoDate ?? "");
  const [departmentName, setDepartmentName] = useState(
    form?.departmentName ?? "สำนักงานเลขานุการ คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี",
  );
  const [phone, setPhone] = useState(form?.phone ?? "3944");
  const [addressee, setAddressee] = useState(form?.addressee ?? "คณบดีคณะรัฐศาสตร์");
  const [title, setTitle] = useState(initial?.title ?? "จัดซื้อวัสดุสำนักงานประจำปีงบประมาณ 2569");
  const [rationale, setRationale] = useState(
    initial?.rationale ?? "เพื่อสนับสนุนการปฏิบัติงานของหน่วยงานให้เป็นไปอย่างต่อเนื่อง",
  );
  const [requiredDate, setRequiredDate] = useState(initial?.requiredDate ?? "");
  const [items, setItems] = useState<RequestItem[]>(initial?.items ?? initialItems);
  const [fiscalYear, setFiscalYear] = useState(String(initial?.budgetYear ?? "2569"));
  const [fundSource, setFundSource] = useState(initial?.fundSource ?? "เงินงบประมาณแผ่นดิน");
  const [planName, setPlanName] = useState(initial?.planName ?? "แผนงานบริหารทั่วไป");
  const [expenseCategory, setExpenseCategory] = useState(initial?.expenseCategory ?? "ค่าวัสดุ");
  const [sourceCode, setSourceCode] = useState(form?.budgetCodes.sourceCode ?? "2");
  const [departmentCode, setDepartmentCode] = useState(form?.budgetCodes.departmentCode ?? "2301");
  const [fundCode, setFundCode] = useState(form?.budgetCodes.fundCode ?? "6");
  const [planCode, setPlanCode] = useState(form?.budgetCodes.planCode ?? "5102");
  const [subprojectCode, setSubprojectCode] = useState(
    form?.budgetCodes.subprojectCode ?? "51025200",
  );
  const [activityCode, setActivityCode] = useState(
    form?.budgetCodes.activityCode ?? "510252000024",
  );
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
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items],
  );

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
    if (
      step === 1 &&
      (items.length === 0 ||
        items.some(
          (item) =>
            !item.description.trim() ||
            !item.unit.trim() ||
            item.quantity <= 0 ||
            item.unitPrice < 0 ||
            item.marketPrice == null ||
            item.marketPrice < 0 ||
            !item.priceSource.trim(),
        ))
    ) {
      return "กรุณากรอกรายการ จำนวน หน่วย ราคา ราคากลาง และแหล่งที่มาของราคาให้ครบถ้วน";
    }
    if (
      step === 2 &&
      (!fiscalYear ||
        !fundSource ||
        !planName ||
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
        // An unsent preview has no official request number or approval signatures.
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
          total_amount: item.quantity * item.unitPrice,
        })),
      }),
    );
  }

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
          <div className="space-y-6">
            <div className="grid gap-5 border-b border-slate-200 pb-6 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">ส่วนงาน *</span>
                <input
                  className={inputClass}
                  value={departmentName}
                  onChange={(event) => setDepartmentName(event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">โทรศัพท์ *</span>
                <input
                  className={inputClass}
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  ที่ / เลขที่หนังสือ *
                </span>
                <input
                  className={inputClass}
                  value={documentNo}
                  onChange={(event) => setDocumentNo(event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  วันที่บันทึก *
                </span>
                <input
                  type="date"
                  className={inputClass}
                  value={memoDate}
                  onChange={(event) => setMemoDate(event.target.value)}
                />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-2 block text-sm font-semibold text-slate-700">เรียน *</span>
                <input
                  className={inputClass}
                  value={addressee}
                  onChange={(event) => setAddressee(event.target.value)}
                />
              </label>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-slate-700">ประเภทคำขอ</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["purchase", "คำขอจัดซื้อ", "จัดหาพัสดุหรือครุภัณฑ์"],
                  ["hire", "คำขอจัดจ้าง", "จัดหางานจ้างหรือบริการ"],
                ].map(([value, label, description]) => (
                  <label
                    key={value}
                    className={`cursor-pointer rounded-xl border p-4 transition ${requestType === value ? "border-orange-400 bg-orange-50 ring-2 ring-orange-100" : "border-slate-200 hover:border-orange-200"}`}
                  >
                    <span className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="request-type"
                        checked={requestType === value}
                        onChange={() => setRequestType(value as "purchase" | "hire")}
                        className="mt-1 accent-orange-500"
                      />
                      <span>
                        <span className="block font-semibold text-slate-900">{label}</span>
                        <span className="mt-1 block text-sm text-slate-500">{description}</span>
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                เรื่อง ขอซื้อ/จ้าง *
              </span>
              <input
                className={inputClass}
                value={title}
                onChange={(event) => setTitle(event.target.value)}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                ความประสงค์ วัตถุประสงค์ และเหตุผลความจำเป็น *
              </span>
              <textarea
                className={`${inputClass} min-h-28 resize-y`}
                value={rationale}
                onChange={(event) => setRationale(event.target.value)}
              />
            </label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  วันที่ต้องใช้พัสดุ/งานแล้วเสร็จ *
                </span>
                <input
                  type="date"
                  className={inputClass}
                  value={requiredDate}
                  onChange={(event) => setRequiredDate(event.target.value)}
                />
              </label>
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  หลักเกณฑ์การพิจารณาคัดเลือก
                </span>
                <select
                  className={inputClass}
                  value={selectionCriteria}
                  onChange={(event) =>
                    setSelectionCriteria(
                      event.target.value === "เกณฑ์ราคาประกอบเกณฑ์อื่น"
                        ? "เกณฑ์ราคาประกอบเกณฑ์อื่น"
                        : "เกณฑ์ราคา",
                    )
                  }
                >
                  <option>เกณฑ์ราคา</option>
                  <option>เกณฑ์ราคาประกอบเกณฑ์อื่น</option>
                </select>
              </label>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[1080px] text-sm">
                <thead className="bg-slate-50 text-left text-slate-600">
                  <tr>
                    <th className="p-3">รายการ/ขนาด/ลักษณะ</th>
                    <th className="w-24 p-3">จำนวน</th>
                    <th className="w-24 p-3">หน่วยนับ</th>
                    <th className="w-32 p-3">ราคาต่อหน่วย</th>
                    <th className="w-32 p-3">ราคากลาง</th>
                    <th className="w-44 p-3">แหล่งที่มาของราคา</th>
                    <th className="w-32 p-3 text-right">รวม</th>
                    <th className="w-14 p-3">
                      <span className="sr-only">ลบ</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="p-2">
                        <input
                          aria-label={`ชื่อรายการที่ ${index + 1}`}
                          className={inputClass}
                          value={item.description}
                          onChange={(event) =>
                            updateItem(index, { description: event.target.value })
                          }
                        />
                      </td>
                      <td className="p-2">
                        <input
                          aria-label={`จำนวนรายการที่ ${index + 1}`}
                          type="number"
                          min="0.01"
                          step="0.01"
                          className={inputClass}
                          value={item.quantity}
                          onChange={(event) =>
                            updateItem(index, { quantity: Number(event.target.value) })
                          }
                        />
                      </td>
                      <td className="p-2">
                        <input
                          aria-label={`หน่วยรายการที่ ${index + 1}`}
                          className={inputClass}
                          value={item.unit}
                          onChange={(event) => updateItem(index, { unit: event.target.value })}
                        />
                      </td>
                      <td className="p-2">
                        <input
                          aria-label={`ราคาต่อหน่วยรายการที่ ${index + 1}`}
                          type="number"
                          min="0"
                          step="0.01"
                          className={inputClass}
                          value={item.unitPrice}
                          onChange={(event) =>
                            updateItem(index, { unitPrice: Number(event.target.value) })
                          }
                        />
                      </td>
                      <td className="p-2">
                        <input
                          aria-label={`ราคากลางรายการที่ ${index + 1}`}
                          type="number"
                          min="0"
                          step="0.01"
                          className={inputClass}
                          value={item.marketPrice ?? ""}
                          onChange={(event) =>
                            updateItem(index, {
                              marketPrice:
                                event.target.value === "" ? null : Number(event.target.value),
                            })
                          }
                        />
                      </td>
                      <td className="p-2">
                        <input
                          aria-label={`แหล่งที่มาของราคารายการที่ ${index + 1}`}
                          className={inputClass}
                          value={item.priceSource}
                          onChange={(event) =>
                            updateItem(index, { priceSource: event.target.value })
                          }
                        />
                      </td>
                      <td className="p-3 text-right font-semibold text-slate-800">
                        {money(item.quantity * item.unitPrice)}
                      </td>
                      <td className="p-2">
                        <button
                          type="button"
                          aria-label={`ลบรายการที่ ${index + 1}`}
                          onClick={() =>
                            setItems((current) =>
                              current.filter((_, itemIndex) => itemIndex !== index),
                            )
                          }
                          className="grid size-10 place-items-center rounded-lg text-[var(--ink)] hover:bg-red-50 hover:text-red-700"
                        >
                          <Trash2 size={17} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-orange-50">
                  <tr>
                    <td colSpan={6} className="p-4 text-right font-semibold text-slate-700">
                      รวม {items.length} รายการ
                    </td>
                    <td className="p-4 text-right text-lg font-bold text-orange-700">
                      {money(total)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  setItems((current) => [
                    ...current,
                    {
                      description: "",
                      quantity: 1,
                      unit: "ชิ้น",
                      unitPrice: 0,
                      marketPrice: 0,
                      priceSource: "",
                    },
                  ])
                }
              >
                <Plus size={17} /> เพิ่มรายการ
              </Button>
              <p className="text-sm text-slate-500">
                {items.length > 10
                  ? "ระบบจะสร้างเอกสารแนบรายการเกิน 10 รายการให้อัตโนมัติ"
                  : `เพิ่มได้อีก ${10 - items.length} รายการก่อนแยกเป็นเอกสารแนบ`}
              </p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">ปีงบประมาณ</span>
              <select
                className={inputClass}
                value={fiscalYear}
                onChange={(event) => setFiscalYear(event.target.value)}
              >
                {fiscalYears.map((year) => (
                  <option key={year} value={year}>
                    พ.ศ. {year}
                  </option>
                ))}
                {!fiscalYears.some((year) => year === fiscalYear) && (
                  <option value={fiscalYear}>พ.ศ. {fiscalYear}</option>
                )}
              </select>
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-700">แหล่งเงิน</span>
              <select
                className={inputClass}
                value={fundSource}
                onChange={(event) => setFundSource(event.target.value)}
              >
                <option>เงินงบประมาณแผ่นดิน</option>
                <option>เงินรายได้</option>
                {!["เงินงบประมาณแผ่นดิน", "เงินรายได้"].includes(fundSource) && (
                  <option>{fundSource}</option>
                )}
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
                {!["ค่าวัสดุ", "ค่าใช้สอย", "ค่าครุภัณฑ์"].includes(expenseCategory) && (
                  <option>{expenseCategory}</option>
                )}
              </select>
            </label>
            <div className="sm:col-span-2 border-t border-slate-200 pt-5">
              <h3 className="font-bold text-slate-900">รหัสงบประมาณตามแบบฟอร์ม</h3>
              <p className="mt-1 text-sm text-slate-500">
                ใช้สำหรับส่งต่อให้เจ้าหน้าที่การเงินตรวจสอบและคุมยอด
              </p>
            </div>
            {[
              ["รหัสแหล่งเงิน", sourceCode, setSourceCode],
              ["รหัสหน่วยงาน", departmentCode, setDepartmentCode],
              ["รหัสกองทุน", fundCode, setFundCode],
              ["รหัสแผนงาน", planCode, setPlanCode],
              ["รหัสโครงการย่อย", subprojectCode, setSubprojectCode],
              ["รหัสกิจกรรม", activityCode, setActivityCode],
            ].map(([label, value, setter]) => (
              <label key={label as string} className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">
                  {label as string}
                </span>
                <input
                  inputMode="numeric"
                  className={inputClass}
                  value={value as string}
                  onChange={(event) =>
                    (setter as (value: string) => void)(event.target.value.replace(/\D/g, ""))
                  }
                />
              </label>
            ))}
            <div className="sm:col-span-2 border border-orange-200 bg-orange-50 p-5">
              <p className="text-sm font-semibold text-orange-900">วงเงินที่จะซื้อหรือจ้าง</p>
              <p className="mt-1 text-2xl font-bold text-orange-700">{money(total)}</p>
              <p className="mt-2 text-sm text-orange-800">
                เจ้าหน้าที่การเงินจะตรวจสอบและคุมยอดงบประมาณในขั้นตอนอนุมัติ
              </p>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <label className="flex cursor-pointer items-start gap-3 border border-slate-200 bg-slate-50 p-4">
              <input
                type="checkbox"
                checked={advanceRequired}
                onChange={(event) => {
                  setAdvanceRequired(event.target.checked);
                  if (event.target.checked)
                    setLoanAgreement((current) => ({
                      ...current,
                      projectName: current.projectName || title,
                      purpose: current.purpose || rationale.slice(0, 1000),
                    }));
                }}
                className="mt-1 size-4 accent-orange-600"
              />
              <span>
                <span className="block font-semibold text-slate-900">
                  ขออนุมัติยืมเงินทดรองราชการ
                </span>
                <span className="mt-1 block text-sm text-slate-500">
                  เลือกเมื่อคำขอนี้ต้องดำเนินการยืมเงินตามส่วน (2) ของแบบฟอร์ม
                </span>
              </span>
            </label>
            {advanceRequired && (
              <LoanAgreementFields
                value={loanAgreement}
                onChange={setLoanAgreement}
                total={total}
              />
            )}
            {advanceRequired && (
              <Button variant="secondary" onClick={openPreview} disabled={isPending}>
                <Printer size={17} aria-hidden="true" /> ดู ว119 และสัญญายืมเงิน / PDF
              </Button>
            )}
            {existingAttachments.length > 0 && (
              <section aria-label="เอกสารแนบเดิม">
                <h3 className="font-bold">เอกสารแนบเดิม {existingAttachments.length} ไฟล์</h3>
                <ul className="mt-3 divide-y border border-[var(--line)]">
                  {existingAttachments.map((attachment) => {
                    const pendingRemoval = pendingRemovalIds.includes(attachment.id);
                    return (
                      <li
                        key={attachment.id}
                        className={`flex flex-wrap items-center justify-between gap-3 p-3 ${pendingRemoval ? "bg-[var(--red-soft)]" : ""}`}
                      >
                        <span className="min-w-0 basis-full break-words [overflow-wrap:anywhere] sm:flex-1 sm:basis-auto">
                          {attachment.fileName} · {formatAttachmentSize(attachment.sizeBytes)}
                          {pendingRemoval && (
                            <span className="mt-1 block text-sm font-semibold text-[var(--red)]">
                              รอลบเมื่อบันทึก
                            </span>
                          )}
                        </span>
                        <div className="ml-auto flex flex-wrap items-center gap-2">
                          <a
                            href={`/api/request-attachments/${attachment.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 p-2 underline underline-offset-4"
                            aria-label={`เปิด ${attachment.fileName} ในแท็บใหม่`}
                          >
                            เปิดไฟล์เดิม
                          </a>
                          <button
                            type="button"
                            disabled={isPending}
                            aria-label={`${pendingRemoval ? "ยกเลิกการลบ" : "ลบเอกสารเดิม"} ${attachment.fileName}`}
                            onClick={() =>
                              setPendingRemovalIds((current) =>
                                pendingRemoval
                                  ? current.filter((id) => id !== attachment.id)
                                  : [...current, attachment.id],
                              )
                            }
                            className="inline-flex min-h-11 items-center gap-2 border border-[var(--red)] px-3 text-sm font-semibold text-[var(--red)] hover:bg-white disabled:opacity-45"
                          >
                            {!pendingRemoval && <Trash2 size={16} aria-hidden="true" />}
                            {pendingRemoval ? "ยกเลิกการลบ" : "ลบ"}
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                <p className="mt-2 text-sm">
                  กด “ลบ” เพื่อเลือกไฟล์ที่จะนำออก ยังยกเลิกการลบได้ก่อนกด
                  “บันทึกการแก้ไขและส่งใหม่” หากต้องการแทนที่ไฟล์ ให้แนบไฟล์ใหม่ด้านล่าง
                </p>
                <p role="status" className="mt-2 text-sm font-semibold">
                  เก็บไฟล์เดิม {retainedAttachments.length} ไฟล์ · รอลบ{" "}
                  {pendingRemovalAttachments.length} ไฟล์
                </p>
              </section>
            )}
            <AttachmentPicker files={attachments} onChange={setAttachments} disabled={isPending} />
            {initial && (
              <p className="text-sm">
                ตัวอย่างก่อนบันทึกจะแสดงข้อมูลที่แก้ไขและรวมได้เฉพาะไฟล์ที่แนบใหม่
                หลังส่งใหม่สามารถดาวน์โหลด PDF รวมเอกสารทั้งหมดจากหน้าคำขอได้
              </p>
            )}
            <p className="text-sm leading-6 text-[var(--ink)]">
              ต้องการรวมแบบ ว119 และเอกสารแนบเป็น PDF ไฟล์เดียว ให้แนบ PDF, JPG หรือ PNG แล้วกด
              “ดูตัวอย่าง / พิมพ์ / PDF” และเลือก “ดาวน์โหลด PDF รวมเอกสารแนบ” หากเป็น Word/Excel
              กรุณาแปลงเป็น PDF ก่อนแนบ การดาวน์โหลดฉบับร่างจะไม่ส่งคำขอ
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div className="border border-slate-200 bg-slate-50 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-orange-600">
                {requestType === "purchase" ? "คำขอจัดซื้อ" : "คำขอจัดจ้าง"} · ว119
              </p>
              <h3 className="mt-2 text-lg font-bold text-slate-900">{title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{rationale}</p>
              <p className="mt-4 border-t border-slate-200 pt-3 text-sm text-slate-600">
                {documentNo} · ลงวันที่ {memoDate} · เรียน {addressee}
              </p>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-sm text-slate-500">วันที่ต้องการใช้</dt>
                <dd className="mt-1 font-semibold text-slate-900">{requiredDate}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">จำนวนรายการ</dt>
                <dd className="mt-1 font-semibold text-slate-900">{items.length} รายการ</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">แหล่งเงิน</dt>
                <dd className="mt-1 font-semibold text-slate-900">{fundSource}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">ยอดรวม</dt>
                <dd className="mt-1 text-xl font-bold text-orange-700">{money(total)}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">หลักเกณฑ์คัดเลือก</dt>
                <dd className="mt-1 font-semibold text-slate-900">{selectionCriteria}</dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">รหัสงบประมาณ</dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {sourceCode} / {departmentCode} / {fundCode} / {planCode}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">การยืมเงินทดรองราชการ</dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {advanceRequired ? "ประสงค์ยืมเงิน" : "ไม่ประสงค์ยืมเงิน"}
                  {advanceRequired && (
                    <span className="mt-1 block text-sm font-normal">
                      ผู้ยืม {loanAgreement.borrowerName} · สัญญาจะต่อท้ายแบบฟอร์ม ว119
                    </span>
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-slate-500">เอกสารแนบ</dt>
                <dd className="mt-1 font-semibold text-slate-900">
                  {attachmentCount} ไฟล์
                  {initial &&
                    ` (เดิม ${retainedAttachments.length} / เพิ่มใหม่ ${attachments.length})`}
                </dd>
              </div>
            </dl>
            {pendingRemovalAttachments.length > 0 && (
              <section
                aria-label="ตรวจสอบเอกสารที่จะลบ"
                className="border border-[var(--red)] bg-[var(--red-soft)] p-4 text-[var(--red)]"
              >
                <h3 className="font-bold">เอกสารที่จะลบ {pendingRemovalAttachments.length} ไฟล์</h3>
                <ul className="mt-2 list-inside list-disc break-words [overflow-wrap:anywhere]">
                  {pendingRemovalAttachments.map((file) => (
                    <li key={file.id}>{file.fileName}</li>
                  ))}
                </ul>
                <p className="mt-2 text-sm">
                  เมื่อกด “บันทึกการแก้ไขและส่งใหม่” ระบบจะลบไฟล์ที่เลือก หากส่งคำขอใหม่ไม่สำเร็จ
                  ไฟล์ที่ลบแล้วจะไม่กลับคืน ต้องแนบใหม่หากต้องการใช้อีก
                </p>
              </section>
            )}
            <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              {initial
                ? `บันทึกและส่งคำขอ ${initial.requestNo} ใหม่ กลับไปตรวจสอบในขั้นตอนที่ ${initial.currentStep} โดยไม่ออกเลขคำขอใหม่`
                : "เมื่อส่งคำขอ ระบบจะออกเลขเอกสารอัตโนมัติ บันทึกข้อมูลตามแบบ ว119 และสร้างงานตรวจสอบให้เจ้าหน้าที่พัสดุ"}
            </div>
          </div>
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
