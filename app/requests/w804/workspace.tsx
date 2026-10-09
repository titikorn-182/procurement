"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Download, FolderOpen, Plus, Printer } from "lucide-react";
import { AttachmentPicker } from "@/app/components/attachment-picker";
import { Button, PageHeader } from "@/app/components/ui";
import type { SelectedAttachment } from "@/app/lib/request-attachments";
import { toLocalBundleAttachments } from "@/lib/pdf/bundle-attachments";
import { PrintButton } from "../[id]/print/print-button";
import { W804_DOCUMENTS, type W804DocumentKind } from "./config";
import {
  createW804Draft,
  documentErrors,
  MAX_DRAFT_BYTES,
  parseW804Draft,
  w804DraftSchema,
  type W804Draft,
} from "./model";
import { CommonFields, PurchaseFields, ResultsFields, Section, SignatureFields } from "./fields";
import { W804Document } from "./document";

/* Operate / bounded extension: inherit Document Control Center (seed c8707b00).
 * Three report links share one in-memory draft; explicit local JSON saves only.
 * Source: supplied municipal memo/TOR examples, adapted to the faculty. No
 * sample people, expenses, signatures, approval assertions or database writes.
 * FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
 */
export function W804Workspace({
  kind,
  fiscalYear,
  fontClassName,
}: {
  kind: W804DocumentKind;
  fiscalYear: string;
  fontClassName: string;
}) {
  const [data, setData] = useState(() => createW804Draft(fiscalYear));
  const [dirty, setDirty] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ data: W804Draft; kind: W804DocumentKind } | null>(null);
  const [files, setFiles] = useState<Record<W804DocumentKind, SelectedAttachment[]>>({
    purchase: [],
    summary: [],
    settlement: [],
  });
  const [busyKind, setBusyKind] = useState<W804DocumentKind | null>(null);
  const busy = busyKind === kind;
  const onBusyChange = useCallback((active: boolean) => setBusyKind(active ? kind : null), [kind]);
  const [importing, setImporting] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const alertRef = useRef<HTMLDivElement>(null);
  const previewHeading = useRef<HTMLHeadingElement>(null);
  const title = W804_DOCUMENTS.find((entry) => entry.id === kind)!.label;
  // Navigating among query variants keeps this same component and draft mounted.
  const showPreview = preview?.kind === kind;
  const bundleFiles = useMemo(() => toLocalBundleAttachments(files[kind]), [files, kind]);
  const previewDocument = useMemo(
    () =>
      preview && (
        <W804Document data={preview.data} kind={preview.kind} fontClassName={fontClassName} />
      ),
    [preview, fontClassName],
  );
  const hasFiles = Object.values(files).some((attachments) => attachments.length > 0);

  useEffect(() => {
    if (!dirty && !hasFiles) return;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: MouseEvent) => {
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
      const url = new URL(anchor.href, window.location.href);
      if (url.origin === window.location.origin && url.pathname === "/requests/w804") return;
      if (
        !window.confirm(
          "ข้อมูลหรือไฟล์แนบของ ว804 จะไม่คงอยู่เมื่อออกจากหน้านี้ ควรบันทึกแบบร่างลงเครื่องก่อน ต้องการออกหรือไม่?",
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
  }, [dirty, hasFiles]);
  useEffect(() => {
    if (errors.length) alertRef.current?.focus();
  }, [errors]);
  useEffect(() => {
    if (showPreview) previewHeading.current?.focus();
  }, [showPreview]);

  function update(next: W804Draft) {
    setData(next);
    setDirty(true);
    setPreview(null);
    setMessage("");
    setErrors([]);
  }
  function confirmReplace() {
    return (
      !(dirty || hasFiles) ||
      window.confirm(
        "การเปิดหรือสร้างแบบร่างใหม่จะแทนที่ข้อมูลปัจจุบันและล้างไฟล์แนบ ต้องการดำเนินการต่อหรือไม่?",
      )
    );
  }
  function saveDraft() {
    const parsed = w804DraftSchema.safeParse(data);
    if (!parsed.success) {
      setErrors(["ยังบันทึกแบบร่างไม่ได้ กรุณาตรวจวันที่ ตัวเลข และความยาวข้อความ"]);
      return;
    }
    const contents = JSON.stringify(parsed.data, null, 2);
    if (new Blob([contents]).size > MAX_DRAFT_BYTES) {
      setErrors(["ข้อมูลแบบร่างเกิน 250 KB กรุณาลดข้อความหรือจำนวนรายการ"]);
      return;
    }
    const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "W804-draft.json";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    setDirty(false);
    setErrors([]);
    setMessage(
      "สร้างไฟล์ W804-draft.json แล้ว กรุณาตรวจสอบโฟลเดอร์ดาวน์โหลด ไฟล์นี้เก็บข้อมูลทั้ง 3 รายงาน แต่ไม่รวมไฟล์แนบ",
    );
  }
  async function openDraft(file?: File) {
    if (!file || !confirmReplace()) return;
    setImporting(true);
    try {
      if (file.size > MAX_DRAFT_BYTES) throw new Error("ไฟล์แบบร่างใหญ่เกิน 250 KB");
      const next = parseW804Draft(await file.text());
      setData(next);
      setFiles({ purchase: [], summary: [], settlement: [] });
      setDirty(false);
      setPreview(null);
      setErrors([]);
      setMessage("เปิดข้อมูลทั้ง 3 รายงานแล้ว กรุณาเลือกไฟล์แนบใหม่หากต้องการรวม PDF");
    } catch (error) {
      setErrors([
        error instanceof Error && !(error instanceof SyntaxError)
          ? error.message
          : "อ่านไฟล์ไม่ได้ กรุณาเลือกไฟล์ W804-draft.json ที่บันทึกจากระบบนี้ ข้อมูลปัจจุบันยังอยู่ครบ",
      ]);
    } finally {
      setImporting(false);
    }
  }
  function openPreview() {
    const issues = documentErrors(data, kind);
    setErrors(issues);
    if (!issues.length) {
      setPreview({ data: structuredClone(data), kind });
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  return (
    <div className="min-w-0">
      <PageHeader
        title="คำขอซื้อ ว804 ไม่เกิน 50,000 บาท"
        description="จัดทำเอกสารสำหรับคณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี"
      />
      <div className="print-hidden mt-5 border border-[var(--line)] bg-white px-4 py-3 text-sm leading-6">
        <strong>โหมดจัดทำและพิมพ์เอกสาร — ยังไม่เชื่อมสายอนุมัติ</strong>
        <p>
          ข้อมูลทั้ง 3 รายงานใช้ร่วมกันในหน้านี้ ไม่บันทึกในฐานข้อมูล
          กรุณาบันทึกแบบร่างลงเครื่องก่อนออกจากหน้า ไฟล์แนบต้องเลือกใหม่เมื่อเปิดแบบร่าง
        </p>
      </div>
      <nav
        aria-label="เลือกรายงาน ว804"
        className="print-hidden mt-5 flex flex-col border border-[var(--line-dark)] sm:flex-row"
      >
        {W804_DOCUMENTS.map(({ id, label }, index) => (
          <Link
            key={id}
            href={`/requests/w804?document=${id}`}
            aria-current={kind === id ? "page" : undefined}
            className={`flex min-h-12 flex-1 items-center gap-2 border-b border-[var(--line)] px-4 py-3 text-sm leading-6 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0 ${kind === id ? "bg-[var(--graphite)] font-bold text-white" : "bg-white hover:bg-[var(--paper-warm)]"}`}
          >
            <span aria-hidden="true">{index + 1}.</span>
            {label}
          </Link>
        ))}
      </nav>
      <div className="print-hidden my-5 flex flex-wrap gap-2">
        <Button variant="secondary" onClick={saveDraft} disabled={importing || busy}>
          <Download size={17} aria-hidden="true" /> บันทึกแบบร่าง (.json)
        </Button>
        <Button
          variant="secondary"
          onClick={() => fileInput.current?.click()}
          disabled={importing || busy}
        >
          <FolderOpen size={17} aria-hidden="true" />
          {importing ? "กำลังเปิดแบบร่าง..." : "เปิดแบบร่าง"}
        </Button>
        <Button
          variant="secondary"
          disabled={importing || busy}
          onClick={() => {
            if (confirmReplace()) {
              setData(createW804Draft(fiscalYear));
              setFiles({ purchase: [], summary: [], settlement: [] });
              setPreview(null);
              setDirty(false);
              setErrors([]);
              setMessage("สร้างชุดเอกสารใหม่แล้ว");
            }
          }}
        >
          <Plus size={17} aria-hidden="true" /> สร้างชุดใหม่
        </Button>
        <input
          ref={fileInput}
          type="file"
          accept=".json,application/json"
          aria-label="เปิดไฟล์แบบร่าง ว804"
          className="sr-only"
          disabled={importing || busy}
          onChange={(e) => {
            void openDraft(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <p className="self-center text-sm text-stone-600" aria-live="polite">
          {dirty ? "มีข้อมูลที่ยังไม่บันทึกลงเครื่อง" : "ข้อมูลอยู่เฉพาะในหน้านี้/ไฟล์ที่ดาวน์โหลด"}
        </p>
      </div>
      {message && (
        <p
          role="status"
          className="mb-5 border border-[var(--line)] bg-white p-4 text-sm leading-6"
        >
          {message}
        </p>
      )}
      {errors.length > 0 && (
        <div
          ref={alertRef}
          tabIndex={-1}
          role="alert"
          className="mb-5 border border-[var(--red)] bg-[var(--red-soft)] p-4 text-[var(--red)]"
        >
          <p className="font-bold">กรุณาตรวจสอบข้อมูลก่อนดำเนินการ</p>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}
      {showPreview && preview ? (
        <>
          <div className="print-hidden mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 ref={previewHeading} tabIndex={-1} className="text-xl font-bold">
              ตัวอย่าง{title}
            </h2>
            <Button variant="secondary" disabled={busy} onClick={() => setPreview(null)}>
              <ArrowLeft size={17} aria-hidden="true" /> กลับไปแก้ไข
            </Button>
          </div>
          <div className="mb-5">
            <PrintButton
              targetId="w804-print-document"
              fileName={`W804-${kind}.pdf`}
              paginated
              isolatePrint
              attachments={bundleFiles}
              onBusyChange={onBusyChange}
            />
          </div>
          {previewDocument}
        </>
      ) : (
        <div className="border border-[var(--line-dark)] bg-[var(--paper)] px-4 sm:px-6">
          <div className="border-b border-[var(--line)] py-5">
            <h2 className="text-xl font-bold">{title}</h2>
            <p className="mt-1 text-sm text-stone-600">
              เป็นแบบฟอร์มสำหรับนำเสนอพิจารณา ไม่ใช่เอกสารที่ได้รับอนุมัติแล้ว
            </p>
          </div>
          <fieldset disabled={importing} className="min-w-0">
            <CommonFields data={data} kind={kind} onChange={update} />
            {kind === "purchase" ? (
              <PurchaseFields data={data} onChange={update} />
            ) : (
              <ResultsFields data={data} kind={kind} onChange={update} />
            )}
            <SignatureFields data={data} onChange={update} />
            <Section
              title="ไฟล์แนบสำหรับรวม PDF"
              hint="เลือกเฉพาะเอกสารของรายงานนี้ ไฟล์ไม่ถูกอัปโหลดและไม่รวมอยู่ในแบบร่าง .json เอกสาร Word/Excel ต้องแปลงเป็น PDF ก่อนแนบ"
            >
              <AttachmentPicker
                mode="local-pdf"
                files={files[kind]}
                onChange={(next) => setFiles((current) => ({ ...current, [kind]: next }))}
              />
            </Section>
          </fieldset>
          <div className="flex flex-wrap justify-between gap-3 border-t border-[var(--line)] py-5">
            <Button variant="secondary" onClick={saveDraft} disabled={importing}>
              บันทึกแบบร่าง (.json)
            </Button>
            <Button onClick={openPreview} disabled={importing}>
              <Printer size={17} aria-hidden="true" /> ตรวจสอบ / พิมพ์ / ดาวน์โหลด PDF
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
