"use client";

import { useId, useRef, useState } from "react";
import { FileText, Trash2, Upload } from "lucide-react";
import {
  acceptedAttachmentTypes,
  formatAttachmentSize,
  validateAttachmentCandidates,
  type SelectedAttachment,
} from "../lib/request-attachments";
import { Button } from "./ui";

export function AttachmentPicker({
  files,
  onChange,
  disabled = false,
  mode = "upload",
}: {
  files: readonly SelectedAttachment[];
  onChange: (files: SelectedAttachment[]) => void;
  disabled?: boolean;
  mode?: "upload" | "local-pdf";
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const additions = Array.from(fileList).map((file) => ({ id: crypto.randomUUID(), file }));
    if (
      mode === "local-pdf" &&
      additions.some(({ file }) => !/\.(pdf|jpe?g|png)$/i.test(file.name))
    ) {
      setValidationError(
        "การรวม PDF รองรับเฉพาะ PDF, JPG และ PNG กรุณาแปลง Word/Excel เป็น PDF ก่อนแนบ",
      );
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    const nextFiles = [...files, ...additions];
    const error = validateAttachmentCandidates(nextFiles.map((selection) => selection.file));
    if (error) {
      setValidationError(error);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setValidationError(null);
    onChange(nextFiles);
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-4">
      <div className="border-2 border-dashed border-[var(--line-dark)] bg-white p-6 text-center sm:p-8">
        <Upload className="mx-auto text-[var(--orange)]" size={32} aria-hidden="true" />
        <p className="mt-3 font-bold text-[var(--ink)]">เอกสารประกอบคำขอ</p>
        <p className="mx-auto mt-1 max-w-2xl text-sm leading-6 text-stone-600">
          {mode === "local-pdf"
            ? "รองรับ PDF, JPG และ PNG ใช้รวมใน PDF บนเครื่องนี้เท่านั้น ไม่อัปโหลดเข้าเซิร์ฟเวอร์"
            : "รองรับ PDF, JPG, PNG, DOCX และ XLSX"}{" "}
          ขนาดไม่เกิน 20 MB ต่อไฟล์ รวมไม่เกิน 50 MB
        </p>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept={mode === "local-pdf" ? ".pdf,.jpg,.jpeg,.png" : acceptedAttachmentTypes}
          className="sr-only"
          disabled={disabled}
          aria-describedby={`${inputId}-error`}
          onChange={(event) => addFiles(event.target.files)}
        />
        <Button
          type="button"
          variant="secondary"
          className="mt-4"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          เลือกไฟล์จากเครื่อง
        </Button>
      </div>

      <p
        id={`${inputId}-error`}
        role="alert"
        className="min-h-5 text-sm font-semibold text-[var(--red)]"
      >
        {validationError}
      </p>

      {files.length > 0 && (
        <ul
          aria-label="ไฟล์ที่เลือก"
          className="divide-y divide-[var(--line)] border border-[var(--line)]"
        >
          {files.map((selection) => (
            <li key={selection.id} className="flex min-w-0 items-center gap-3 p-3">
              <FileText className="shrink-0 text-[var(--orange)]" size={20} aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--ink)]">
                  {selection.file.name}
                </p>
                <p className="text-xs text-stone-500">
                  {formatAttachmentSize(selection.file.size)} ·{" "}
                  {mode === "local-pdf"
                    ? "ใช้รวม PDF เฉพาะครั้งนี้ ไม่อัปโหลด"
                    : "รออัปโหลดเมื่อส่งคำขอ"}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex size-10 shrink-0 items-center justify-center border border-transparent text-stone-600 hover:border-[var(--red)] hover:bg-[var(--red-soft)] hover:text-[var(--red)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:opacity-45"
                aria-label={`ลบไฟล์ ${selection.file.name}`}
                disabled={disabled}
                onClick={() => onChange(files.filter((file) => file.id !== selection.id))}
              >
                <Trash2 size={18} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
