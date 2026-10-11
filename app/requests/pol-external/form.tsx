"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Download, FolderOpen, Printer } from "lucide-react";
import { Button, PageHeader } from "@/app/components/ui";
import { AttachmentPicker } from "@/app/components/attachment-picker";
import {
  maxAttachmentCount,
  maxTotalAttachmentSizeBytes,
  type SelectedAttachment,
} from "@/app/lib/request-attachments";
import { uploadRequestAttachments } from "@/app/lib/request-attachments.client";
import { toLocalBundleAttachments } from "@/lib/pdf/bundle-attachments";
import { createRequestDraft, submitRequestDraft } from "../new/actions";
import { updateReturnedRequest, resubmitReturnedRequest } from "../[id]/edit/actions";
import type { ReturnedStandardRequestEditData } from "../[id]/edit/types";
import { PrintButton } from "../[id]/print/print-button";
import { ExternalDocument, externalPreviewData } from "./document";
import { ExternalGeneralFields, ExternalItemFields, ExternalBudgetFields } from "./fields";
import {
  createExternalDraft,
  EXTERNAL_STEPS,
  externalDraftSchema,
  externalInput,
  externalStepError,
  externalTotal,
  fundingOptions,
  validateExternalSubmission,
  type ExternalDraft,
} from "./model";
import { externalMethodLabels } from "./schema";
import { formatDocumentMoney as money } from "@/lib/pdf/format";

/* THESIS: an external-funded POL-01 dossier, guided through the existing five steps.
 * OWN-WORLD: incumbent graphite shell, paper ledger, orange actions, square controls.
 * STORY: enter source-PDF fields, verify items/budget/evidence, then submit to POL-01.
 * FIRST VIEWPORT: title and preview, five-step route, aligned general fields, Next/Back.
 * FORM: user-approved option A, .impeccable/mocks/pol-external/option-a.png.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
 */
export function ExternalForm({
  today,
  fontClassName,
  initial,
}: {
  today: string;
  fontClassName: string;
  initial?: ReturnedStandardRequestEditData;
}) {
  const router = useRouter();
  const [data, setData] = useState(() => createExternalDraft(today, initial));
  const [step, setStep] = useState(0);
  const [files, setFiles] = useState<SelectedAttachment[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [printBusy, setPrintBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [preview, setPreview] = useState(false);
  const [draft, setDraft] = useState<{ id: string; requestNo: string } | null>(null);
  const sending = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const previewData = useMemo(() => externalPreviewData(data), [data]);
  const bundleFiles = useMemo(
    () => [
      ...(initial?.attachments ?? []).map((file) => ({
        id: file.id,
        name: file.fileName,
        sizeBytes: file.sizeBytes,
        mimeType: "",
      })),
      ...toLocalBundleAttachments(files),
    ],
    [initial, files],
  );
  const attachmentCount = (initial?.attachments.length ?? 0) + files.length;
  const locked = busy || Boolean(draft);

  useEffect(() => {
    if (error) alertRef.current?.focus();
  }, [error]);
  useEffect(() => {
    headingRef.current?.focus();
  }, [step, preview]);
  useEffect(() => {
    if (!dirty && files.length === 0) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
      if (sending.current) return;
      const anchor = event.target instanceof Element ? event.target.closest("a") : null;
      if (
        !anchor ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.button !== 0
      )
        return;
      if (
        !window.confirm(
          "ข้อมูลที่ยังไม่ส่งและไฟล์แนบจะไม่คงอยู่เมื่อออกจากหน้านี้ ต้องการออกหรือไม่?",
        )
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", unload);
    document.addEventListener("click", navigate, true);
    return () => {
      window.removeEventListener("beforeunload", unload);
      document.removeEventListener("click", navigate, true);
    };
  }, [dirty, files.length]);
  function update(next: ExternalDraft) {
    setData(next);
    setDirty(true);
    setError("");
    setMessage("");
  }
  function goNext() {
    const issue = externalStepError(data, step, attachmentCount);
    if (issue) {
      setError(issue);
      return;
    }
    setError("");
    setStep((value) => Math.min(4, value + 1));
    window.scrollTo({ top: 0 });
  }
  function saveDraft() {
    const parsed = externalDraftSchema.safeParse(data);
    if (!parsed.success) {
      setError("บันทึกแบบร่างไม่ได้ กรุณาตรวจสอบตัวเลขและความยาวข้อความ");
      return;
    }
    const blob = new Blob([JSON.stringify(parsed.data, null, 2)], { type: "application/json" });
    if (blob.size > 250_000) {
      setError("แบบร่างมีขนาดเกิน 250 KB กรุณาลดข้อความ");
      return;
    }
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "POL-external-draft.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setDirty(false);
    setMessage("ดาวน์โหลดแบบร่างลงเครื่องแล้ว ไม่รวมไฟล์แนบและยังไม่ส่งเข้าสายอนุมัติ");
  }
  async function openDraft(file?: File) {
    if (!file) return;
    if (
      (dirty || files.length) &&
      !window.confirm("เปิดแบบร่างแทนข้อมูลปัจจุบันและล้างไฟล์แนบที่เลือกไว้หรือไม่?")
    )
      return;
    setBusy(true);
    try {
      if (file.size > 250_000) throw new Error("size");
      const parsed = externalDraftSchema.parse(JSON.parse(await file.text()));
      setData(parsed);
      setFiles([]);
      setStep(0);
      setDirty(false);
      setError("");
      setMessage("เปิดแบบร่างแล้ว กรุณาเลือกไฟล์แนบใหม่ก่อนส่ง");
    } catch {
      setError(
        "เปิดไฟล์ไม่ได้ กรุณาเลือก POL-external-draft.json ที่บันทึกจากระบบ (ไม่เกิน 250 KB) ข้อมูลเดิมยังอยู่ครบ",
      );
    } finally {
      setBusy(false);
    }
  }
  async function submit() {
    if (sending.current) return;
    const issue = validateExternalSubmission(data, attachmentCount);
    if (issue) {
      setStep(issue.step);
      setError(issue.message);
      return;
    }
    const totalBytes =
      files.reduce((sum, file) => sum + file.file.size, 0) +
      (initial?.attachments ?? []).reduce((sum, file) => sum + file.sizeBytes, 0);
    if (attachmentCount > maxAttachmentCount || totalBytes > maxTotalAttachmentSizeBytes) {
      setStep(3);
      setError("ไฟล์แนบรวมต้องไม่เกิน 10 ไฟล์ และ 50 MB");
      return;
    }
    sending.current = true;
    setBusy(true);
    setError("");
    try {
      const payload = externalInput(data);
      let active = initial ? { id: initial.id, requestNo: initial.requestNo } : draft;
      setMessage(initial ? "กำลังบันทึกการแก้ไข..." : "กำลังเตรียมคำขอ...");
      if (initial) {
        const result = await updateReturnedRequest(initial.id, payload);
        if (result.error) {
          setError(result.error);
          return;
        }
      } else if (!active) {
        const result = await createRequestDraft(payload);
        if (result.error || !result.requestId || !result.requestNo) {
          setError(result.error ?? "สร้างคำขอไม่สำเร็จ กรุณาลองใหม่");
          return;
        }
        active = { id: result.requestId, requestNo: result.requestNo };
        setDraft(active);
      }
      if (!active) return;
      const uploaded = await uploadRequestAttachments(
        active.id,
        files,
        (progress) => setMessage(`กำลังอัปโหลดเอกสาร ${progress.completed}/${progress.total}`),
        { preserveExisting: Boolean(initial) },
      );
      if (uploaded.error) {
        setError(uploaded.error);
        return;
      }
      setMessage("กำลังส่งเข้าสายอนุมัติ POL-01...");
      const result = initial
        ? await resubmitReturnedRequest(active.id)
        : await submitRequestDraft(active.id);
      if (result.error || !result.requestNo) {
        setError(result.error ?? "ส่งคำขอไม่สำเร็จ กรุณาลองใหม่");
        return;
      }
      setDirty(false);
      setFiles([]);
      router.push(`/requests/${result.requestNo}`);
      router.refresh();
    } catch {
      setError(
        "การเชื่อมต่อขัดข้อง กรุณาตรวจสถานะในหน้าคำขอก่อนลองส่งอีกครั้ง ข้อมูลที่กรอกยังอยู่ในหน้านี้",
      );
    } finally {
      sending.current = false;
      setBusy(false);
      setMessage("");
    }
  }

  if (preview)
    return (
      <div className="min-w-0">
        <div className="print-hidden mb-5 flex flex-wrap items-center justify-between gap-3">
          <Button variant="secondary" disabled={printBusy} onClick={() => setPreview(false)}>
            <ArrowLeft size={17} />
            กลับไปกรอกข้อมูล
          </Button>
          <PrintButton
            targetId="external-preview"
            fileName="POL-external-draft.pdf"
            paginated
            isolatePrint
            attachments={bundleFiles}
            onBusyChange={setPrintBusy}
          />
        </div>
        <h1 ref={headingRef} tabIndex={-1} className="print-hidden mb-4 text-lg font-bold">
          ตัวอย่าง POL- ภายนอก — ฉบับร่างจากข้อมูลที่กรอก ยังไม่ได้ส่งคำขอ
        </h1>
        <ExternalDocument
          data={previewData}
          targetId="external-preview"
          fontClassName={fontClassName}
        />
      </div>
    );

  return (
    <div className="min-w-0">
      <PageHeader
        title="คำขอหลักการ POL- ภายนอก"
        description="โครงการบริการวิชาการจากแหล่งทุนภายนอก · ส่งเข้าสายอนุมัติ POL-01 เดิม"
        action={
          <Button variant="secondary" disabled={busy} onClick={() => setPreview(true)}>
            <Printer size={17} />
            ตัวอย่าง / พิมพ์ PDF
          </Button>
        }
      />
      {initial && (
        <div className="my-5 border border-[var(--amber)] bg-[var(--amber-soft)] p-4 text-sm">
          <strong>แก้ไขคำขอ {initial.requestNo}</strong>
          <p className="mt-2">เหตุผลที่ส่งกลับ: {initial.returnReason}</p>
          <p className="mt-2">ส่งใหม่ในคำขอเดิม เอกสารแนบเดิมยังอยู่ครบ</p>
        </div>
      )}
      <ol
        aria-label="ขั้นตอนคำขอ POL- ภายนอก"
        className="my-6 grid grid-cols-1 border border-[var(--line)] bg-white sm:grid-cols-5"
      >
        {EXTERNAL_STEPS.map((label, index) => (
          <li
            key={label}
            aria-current={step === index ? "step" : undefined}
            className={`flex items-center gap-2 border-b border-[var(--line)] px-3 py-3 text-sm last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 ${step === index ? "bg-[var(--orange-soft)] font-bold text-[var(--orange-dark)]" : "text-[var(--line-dark)]"}`}
          >
            <span
              className={`flex size-7 shrink-0 items-center justify-center ${step === index ? "bg-[var(--orange)] text-white" : "border border-[var(--line)]"}`}
            >
              {index < step ? <Check size={16} aria-label="ผ่านแล้ว" /> : index + 1}
            </span>
            {label}
          </li>
        ))}
      </ol>
      {error && (
        <div
          ref={alertRef}
          role="alert"
          tabIndex={-1}
          className="mb-5 border border-[var(--red)] bg-[var(--red-soft)] p-4 text-sm text-[var(--red)]"
        >
          {error}
        </div>
      )}
      {message && (
        <p role="status" className="mb-5 border border-[var(--line)] bg-white p-4 text-sm">
          {message}
        </p>
      )}
      {draft && (
        <p className="mb-5 border border-[var(--amber)] bg-[var(--amber-soft)] p-4 text-sm">
          สร้างฉบับร่าง {draft.requestNo} แล้ว ข้อมูลถูกล็อกเพื่อป้องกันส่งข้อมูลไม่ตรงกัน
          กดส่งอีกครั้งเพื่อดำเนินการต่อ หรือ{" "}
          <Link className="underline" href={`/requests/${draft.requestNo}`}>
            ตรวจสอบสถานะคำขอ
          </Link>
        </p>
      )}
      <section className="border border-[var(--line-dark)] bg-[var(--paper)]">
        <header className="border-b border-[var(--line)] px-5 py-4">
          <h2 ref={headingRef} tabIndex={-1} className="text-lg font-bold">
            {EXTERNAL_STEPS[step]}
          </h2>
          <p className="mt-1 text-sm text-[var(--line-dark)]">
            ขั้นตอนที่ {step + 1} จาก 5 · ช่องที่มี * จำเป็นต้องกรอก
          </p>
        </header>
        <div className="p-5 sm:p-6">
          <fieldset disabled={locked} className="min-w-0 disabled:opacity-70">
            <legend className="sr-only">{EXTERNAL_STEPS[step]}</legend>
            {step === 0 && <ExternalGeneralFields data={data} update={update} />}
            {step === 1 && <ExternalItemFields data={data} update={update} />}
            {step === 2 && <ExternalBudgetFields data={data} update={update} />}
            {step === 3 && (
              <>
                <p className="mb-5 text-sm leading-6">
                  แนบรายละเอียด TOR ใบเสนอราคา หรือเอกสารประกอบโครงการ
                  หากเป็นผู้ประกอบการรายใหม่ให้แนบเอกสารผู้ประกอบการด้วย ไม่บังคับแนบสัญญายืมเงิน
                </p>
                {initial?.attachments.length ? (
                  <div className="mb-5">
                    <h3 className="mb-2 font-semibold">
                      เอกสารแนบเดิม {initial.attachments.length} ไฟล์ (เก็บไว้ในคำขอนี้)
                    </h3>
                    <ul className="divide-y divide-[var(--line)] border border-[var(--line)]">
                      {initial.attachments.map((file) => (
                        <li
                          key={file.id}
                          className="flex flex-wrap justify-between gap-3 p-3 text-sm"
                        >
                          <span className="min-w-0 break-all">{file.fileName}</span>
                          <a
                            href={`/api/request-attachments/${file.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="underline"
                          >
                            เปิดไฟล์เดิม
                          </a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <AttachmentPicker
                  files={files}
                  disabled={locked}
                  onChange={(next) => {
                    setFiles(next);
                    setDirty(true);
                    setError("");
                  }}
                />
                <p className="mt-5 text-sm text-[var(--line-dark)]">
                  PDF, JPG และ PNG สามารถรวมท้ายแบบฟอร์มเป็น PDF ไฟล์เดียวได้ ไฟล์ Word/Excel
                  ต้องแปลงเป็น PDF ก่อนรวม
                </p>
              </>
            )}
            {step === 4 && (
              <>
                <h3 className="text-xl font-bold break-words">{data.title}</h3>
                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-6">
                  {data.rationale}
                </p>
                <dl className="my-6 grid gap-5 border-y border-[var(--line)] py-5 text-sm sm:grid-cols-2">
                  {[
                    ["แบบคำขอ", `POL- ภายนอก · ${externalMethodLabels[data.metadata.method]}`],
                    ["เรียน", data.metadata.addressee],
                    ["หน่วยงาน", data.metadata.departmentName],
                    ["วันที่ต้องการรับพัสดุ", data.requiredDate],
                    ["ปีงบประมาณ / แหล่งเงิน", `${data.budgetYear} · ${data.fundSource}`],
                    ["แผนงาน", data.planName],
                    ["หมวดรายจ่าย", data.expenseCategory],
                    [
                      "การเงิน",
                      fundingOptions.find(([key]) => key === data.advanceFundingOption)?.[1] ??
                        "ยังไม่เลือก",
                    ],
                    [
                      "ผู้ประกอบการ",
                      data.vendor.kind === "none" ? "ไม่ระบุ" : data.vendor.vendorName,
                    ],
                    ["เอกสารแนบ", `${attachmentCount} ไฟล์`],
                    ...Object.entries(data.budgetCodes).map(([key, value]) => [
                      (
                        {
                          sourceCode: "รหัสแหล่งเงิน",
                          departmentCode: "รหัสหน่วยงาน",
                          fundCode: "รหัสกองทุน",
                          activityCode: "รหัสกิจกรรม",
                        } as Record<string, string>
                      )[key],
                      value,
                    ]),
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[var(--line-dark)]">{label}</dt>
                      <dd className="mt-1 break-words font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="text-lg font-bold tabular-nums">
                  {data.items.length} รายการ · รวม {money(externalTotal(data))} บาท
                </p>
                <p className="mt-5 border border-[var(--line)] p-4 text-sm leading-6">
                  เมื่อยืนยัน ระบบจะสร้างเลขคำขอ POL-01 และส่งให้เจ้าหน้าที่ตามสายอนุมัติเดิม
                  การส่งคำขอยังไม่ถือว่าได้รับอนุมัติ
                </p>
              </>
            )}
          </fieldset>
          <div className="mt-7 flex flex-wrap justify-between gap-3 border-t border-[var(--line)] pt-5">
            <Button
              variant="secondary"
              disabled={step === 0 || busy || Boolean(draft)}
              onClick={() => {
                setStep((value) => value - 1);
                setError("");
              }}
            >
              <ArrowLeft size={16} />
              ย้อนกลับ
            </Button>
            {step < 4 ? (
              <Button disabled={locked} onClick={goNext}>
                ถัดไป
                <ArrowRight size={16} />
              </Button>
            ) : (
              <Button disabled={busy} onClick={() => void submit()}>
                {busy ? "กำลังดำเนินการ..." : initial ? "ยืนยันและส่งใหม่" : "ยืนยันและส่งคำขอ"}
                <Check size={17} />
              </Button>
            )}
          </div>
        </div>
      </section>
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Button variant="secondary" disabled={busy} onClick={saveDraft}>
          <Download size={16} />
          บันทึกแบบร่างลงเครื่อง
        </Button>
        {!initial && (
          <Button variant="secondary" disabled={locked} onClick={() => inputRef.current?.click()}>
            <FolderOpen size={16} />
            เปิดแบบร่าง
          </Button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".json,application/json"
          aria-label="เปิดไฟล์แบบร่าง POL- ภายนอก"
          className="hidden"
          onChange={(event) => {
            void openDraft(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <span className="text-sm text-[var(--line-dark)]">
          แบบร่างไม่รวมไฟล์แนบ และยังไม่ได้ส่งคำขอ
        </span>
      </div>
    </div>
  );
}
