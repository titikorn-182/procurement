"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Download, FolderOpen, Plus, Printer } from "lucide-react";
import { Button, PageHeader } from "@/app/components/ui";
import { AttachmentPicker } from "@/app/components/attachment-picker";
import type { SelectedAttachment } from "@/app/lib/request-attachments";
import { toLocalBundleAttachments } from "@/lib/pdf/bundle-attachments";
import { PrintButton } from "../[id]/print/print-button";
import { BudgetFields, IncidentFields, Section, SignatoryFields } from "./fields";
import { Section79Document } from "./document";
import { useUnsavedChanges } from "./use-unsaved-changes";
import {
  createSection79Draft,
  documentErrors,
  MAX_DRAFT_BYTES,
  parseSection79Draft,
  SECTION79_TITLE,
  section79DraftSchema,
  section79StepErrors,
  type Section79Draft,
} from "./model";

/* THESIS: record an unforeseen urgent purchase/hire before preparing its paper dossier.
 * OWN-WORLD: incumbent graphite sidebar, paper panels, orange actions, Sarabun and square fields.
 * STORY: incident/evidence -> spending/budget -> signatories/attachments -> document preview.
 * FIRST VIEWPORT: title/save/open, explicit local-only notice, 3-step route, two-column memo form.
 * FORM: user-approved A, seed 7a7231f5; .impeccable/mocks/section79/option-a.png.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
 */
const steps = ["เหตุจำเป็นและหลักฐาน", "ค่าใช้จ่ายและงบประมาณ", "ผู้ลงนามและเอกสาร"] as const;
type Step = 0 | 1 | 2;

export function Section79Workspace({
  fiscalYear,
  fontClassName,
}: {
  fiscalYear: string;
  fontClassName: string;
}) {
  const [data, setData] = useState(() => createSection79Draft(fiscalYear));
  const [step, setStep] = useState<Step>(0);
  const [files, setFiles] = useState<SelectedAttachment[]>([]);
  const [dirty, setDirty] = useState(false);
  const [importing, setImporting] = useState(false);
  const [printBusy, setPrintBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<Section79Draft | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const locked = importing || printBusy;
  const bundleFiles = useMemo(() => toLocalBundleAttachments(files), [files]);
  const document = useMemo(
    () => (preview ? <Section79Document data={preview} fontClassName={fontClassName} /> : null),
    [preview, fontClassName],
  );
  useUnsavedChanges(dirty || files.length > 0);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step, preview]);
  useEffect(() => {
    if (errors.length) alertRef.current?.focus();
  }, [errors]);

  function update(next: Section79Draft) {
    setData(next);
    setDirty(true);
    setMessage("");
    setErrors([]);
    setPreview(null);
  }
  function confirmReplace() {
    return (
      !(dirty || files.length) ||
      window.confirm(
        "การเปิดหรือสร้างแบบร่างใหม่จะแทนที่ข้อมูลปัจจุบันและล้างไฟล์แนบ ต้องการดำเนินการต่อหรือไม่?",
      )
    );
  }
  function saveDraft() {
    const result = section79DraftSchema.safeParse(data);
    if (!result.success) {
      setErrors(["ยังบันทึกแบบร่างไม่ได้ กรุณาตรวจรูปแบบวันที่ จำนวนเงิน และความยาวข้อความ"]);
      return;
    }
    const contents = JSON.stringify(result.data, null, 2);
    if (new Blob([contents]).size > MAX_DRAFT_BYTES) {
      setErrors(["แบบร่างเกิน 250 KB กรุณาลดความยาวข้อความ"]);
      return;
    }
    const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
    const link = window.document.createElement("a");
    link.href = url;
    link.download = "Section79-draft.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setDirty(false);
    setErrors([]);
    setMessage(
      "สร้างไฟล์ Section79-draft.json แล้ว กรุณาตรวจโฟลเดอร์ดาวน์โหลด แบบร่างไม่รวมไฟล์แนบและไม่ถูกบันทึกในฐานข้อมูล",
    );
  }
  async function openDraft(file?: File) {
    if (!file || !confirmReplace()) return;
    setImporting(true);
    try {
      if (file.size > MAX_DRAFT_BYTES) throw new Error("ไฟล์แบบร่างใหญ่เกิน 250 KB");
      const next = parseSection79Draft(await file.text());
      setData(next);
      setFiles([]);
      setDirty(false);
      setPreview(null);
      setStep(0);
      setErrors([]);
      setMessage("เปิดแบบร่างแล้ว กรุณาเลือกไฟล์แนบใหม่หากต้องการรวมเอกสาร PDF");
    } catch {
      setErrors([
        "อ่านแบบร่างไม่ได้ กรุณาเลือกไฟล์ Section79-draft.json ที่ถูกต้องและไม่เกิน 250 KB ข้อมูลปัจจุบันยังอยู่ครบ",
      ]);
    } finally {
      setImporting(false);
    }
  }
  function moveStep(next: Step) {
    if (next > step) {
      for (let i = 0; i < next; i++) {
        const issues = section79StepErrors(data, i as Step);
        if (issues.length) {
          setStep(i as Step);
          setErrors(issues);
          return;
        }
      }
    }
    setStep(next);
    setErrors([]);
    setMessage("");
  }
  function openPreview() {
    const issues = documentErrors(data);
    setErrors(issues);
    if (!issues.length) {
      setPreview(structuredClone(data));
      window.scrollTo({ top: 0 });
    }
  }

  return (
    <div className="min-w-0">
      <PageHeader
        title={SECTION79_TITLE}
        description="จัดทำรายงานขอความเห็นชอบและขออนุมัติ พร้อมเอกสารประกอบสำหรับพิมพ์"
        action={
          <div className="print-hidden flex shrink-0 flex-wrap gap-2">
            <Button variant="secondary" onClick={saveDraft} disabled={locked}>
              <Download size={17} aria-hidden="true" /> บันทึกแบบร่าง
            </Button>
            <Button variant="secondary" onClick={() => inputRef.current?.click()} disabled={locked}>
              <FolderOpen size={17} aria-hidden="true" />{" "}
              {importing ? "กำลังเปิด..." : "เปิดแบบร่าง"}
            </Button>
          </div>
        }
      />
      <input
        ref={inputRef}
        type="file"
        accept=".json,application/json"
        aria-label="เปิดไฟล์แบบร่าง ข้อ 79 วรรค 2"
        className="sr-only"
        disabled={locked}
        onChange={(event) => {
          void openDraft(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
      <div className="print-hidden my-5 border border-[var(--line)] bg-[var(--orange-soft)] px-4 py-3 text-sm leading-6">
        <strong>โหมดจัดทำและพิมพ์เอกสาร - ยังไม่เชื่อมสายอนุมัติ</strong>
        <p>
          ข้อมูลไม่บันทึกในฐานข้อมูลและไม่มีเลขคำขออัตโนมัติ กรุณาบันทึกแบบร่าง (.json)
          ลงเครื่องก่อนออกจากหน้า ไฟล์แนบต้องเลือกใหม่เมื่อเปิดแบบร่าง
        </p>
      </div>
      {message && (
        <p
          role="status"
          className="print-hidden mb-5 border border-[var(--line)] bg-white p-4 text-sm leading-6"
        >
          {message}
        </p>
      )}
      {errors.length > 0 && (
        <div
          ref={alertRef}
          tabIndex={-1}
          role="alert"
          className="print-hidden mb-5 border border-[var(--red)] bg-[var(--red-soft)] p-4 text-[var(--red)]"
        >
          <p className="font-bold">กรุณาตรวจสอบข้อมูลก่อนดำเนินการ</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {preview ? (
        <>
          <div className="print-hidden mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 ref={headingRef} tabIndex={-1} className="text-xl font-bold focus:outline-none">
              ตรวจสอบแบบฟอร์มก่อนพิมพ์
            </h2>
            <Button variant="secondary" disabled={locked} onClick={() => setPreview(null)}>
              <ArrowLeft size={17} aria-hidden="true" /> กลับไปแก้ไข
            </Button>
          </div>
          <div className="mb-5">
            <PrintButton
              targetId="section79-print-document"
              fileName="Section79.pdf"
              paginated
              isolatePrint
              attachments={bundleFiles}
              onBusyChange={setPrintBusy}
            />
          </div>
          {document}
        </>
      ) : (
        <>
          <nav
            aria-label="ขั้นตอนการจัดทำเอกสาร ข้อ 79 วรรค 2"
            className="mb-5 grid border border-[var(--line)] bg-white sm:grid-cols-3"
          >
            {steps.map((label, index) => (
              <button
                key={label}
                type="button"
                disabled={locked}
                aria-current={step === index ? "step" : undefined}
                className={`flex min-h-16 items-center gap-3 border-b border-[var(--line)] px-4 py-3 text-left last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 ${step === index ? "bg-[var(--orange-soft)] font-bold text-[var(--orange-dark)]" : "hover:bg-[var(--paper-warm)]"}`}
                onClick={() => moveStep(index as Step)}
              >
                <span
                  className={`flex h-8 w-8 shrink-0 items-center justify-center border ${step === index ? "border-[var(--orange)] bg-[var(--orange)] text-white" : "border-[var(--line)]"}`}
                  aria-hidden="true"
                >
                  {index + 1}
                </span>
                <span>{label}</span>
              </button>
            ))}
          </nav>
          <div
            className="min-w-0 border border-[var(--line-dark)] bg-[var(--paper)] px-4 sm:px-6"
            data-section79-step={step}
          >
            <div className={step === 0 ? "sr-only" : "border-b border-[var(--line)] py-5"}>
              <h2 ref={headingRef} tabIndex={-1} className="text-xl font-bold focus:outline-none">
                {steps[step]}
              </h2>
              <p className="mt-1 text-sm text-stone-600">
                ขั้นตอนที่ {step + 1} จาก 3 · เป็นการเตรียมเอกสาร ไม่ใช่ผลอนุมัติ
              </p>
            </div>
            <fieldset disabled={locked} className="min-w-0">
              {step === 0 && <IncidentFields data={data} onChange={update} />}
              {step === 1 && <BudgetFields data={data} onChange={update} />}
              {step === 2 && (
                <>
                  <SignatoryFields data={data} onChange={update} />
                  <Section
                    title="เอกสารแนบสำหรับรวม PDF"
                    hint="เลือก PDF, JPG หรือ PNG ตามลำดับที่จะต่อท้ายแบบฟอร์ม ไฟล์ไม่ถูกอัปโหลดหรือรวมในแบบร่าง .json เอกสาร Word/Excel ต้องแปลงเป็น PDF ก่อน"
                  >
                    <AttachmentPicker mode="local-pdf" files={files} onChange={setFiles} />
                  </Section>
                </>
              )}
            </fieldset>
            <div className="flex flex-wrap justify-between gap-3 border-t border-[var(--line)] py-5">
              <Button
                variant="secondary"
                disabled={locked || step === 0}
                onClick={() => moveStep((step - 1) as Step)}
              >
                <ArrowLeft size={17} aria-hidden="true" /> ย้อนกลับ
              </Button>
              {step < 2 ? (
                <Button disabled={locked} onClick={() => moveStep((step + 1) as Step)}>
                  ถัดไป <ArrowRight size={17} aria-hidden="true" />
                </Button>
              ) : (
                <Button disabled={locked} onClick={openPreview}>
                  <Printer size={17} aria-hidden="true" /> ตรวจสอบ / พิมพ์ PDF
                </Button>
              )}
            </div>
          </div>
        </>
      )}
      <div className="print-hidden mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-stone-600" aria-live="polite">
          {dirty ? "มีข้อมูลที่ยังไม่บันทึกลงเครื่อง" : "ข้อมูลอยู่เฉพาะในหน้านี้/ไฟล์ที่ดาวน์โหลด"}
          {files.length > 0 ? ` · ไฟล์แนบ ${files.length} ไฟล์อยู่เฉพาะในหน้านี้` : ""}
        </p>
        <Button
          variant="secondary"
          disabled={locked}
          onClick={() => {
            if (confirmReplace()) {
              setData(createSection79Draft(fiscalYear));
              setFiles([]);
              setStep(0);
              setPreview(null);
              setDirty(false);
              setErrors([]);
              setMessage("สร้างแบบร่างใหม่แล้ว");
            }
          }}
        >
          <Plus size={17} aria-hidden="true" /> สร้างแบบร่างใหม่
        </Button>
      </div>
    </div>
  );
}
