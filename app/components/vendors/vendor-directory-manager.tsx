"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { LoaderCircle, Plus, Save } from "lucide-react";
import { canManageVendorDirectory, createVendor } from "./vendor-actions";
import { vendorNameSchema, type VendorDirectoryItem } from "./vendor-schema";

type VendorDirectoryManagerProps =
  | {
      purpose?: "select";
      initialName: string;
      onSelect: (vendor: VendorDirectoryItem) => void;
    }
  | { purpose: "manage"; initialName?: never; onSelect?: never };

export function VendorDirectoryManager(props: VendorDirectoryManagerProps) {
  const { initialName = "", onSelect } = props;
  const managing = props.purpose === "manage";
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const savingRef = useRef(false);
  const restoreFocusRef = useRef(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const id = useId();

  useEffect(() => {
    let active = true;
    void canManageVendorDirectory().then(
      (permitted) => {
        if (active) setAllowed(permitted);
      },
      () => {
        if (active) setAllowed(false);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (expanded) nameRef.current?.focus();
  }, [expanded]);

  useEffect(() => {
    if (!pending && restoreFocusRef.current) {
      toggleRef.current?.focus();
      restoreFocusRef.current = false;
    }
  }, [pending]);

  function cancel() {
    if (savingRef.current) return;
    setExpanded(false);
    setError("");
    toggleRef.current?.focus();
  }

  function save() {
    if (savingRef.current) return;
    setError("");
    setNotice("");
    const parsed = vendorNameSchema.safeParse(name);
    if (!parsed.success) {
      setError(parsed.error.issues[0].message);
      nameRef.current?.focus();
      return;
    }
    savingRef.current = true;
    startTransition(async () => {
      try {
        const result = await createVendor(parsed.data);
        if (result.error !== null) {
          setError(result.error);
          return;
        }
        setNotice(
          managing
            ? result.created
              ? `เพิ่ม “${result.vendor.name}” เข้ารายชื่อกลางแล้ว สามารถค้นหาและเลือกใช้ในคำขอได้`
              : `มี “${result.vendor.name}” ในระบบแล้ว ไม่เพิ่มรายชื่อซ้ำ`
            : result.created
              ? `เพิ่ม “${result.vendor.name}” เข้ารายชื่อกลางและเลือกให้แล้ว`
              : `มี “${result.vendor.name}” ในระบบแล้ว เลือกรายชื่อเดิมให้โดยไม่เพิ่มซ้ำ`,
        );
        setExpanded(false);
        if (onSelect) onSelect(result.vendor);
        else restoreFocusRef.current = true;
      } catch {
        setError("ติดต่อระบบไม่สำเร็จ กรุณาค้นหาชื่อนี้ก่อนลองบันทึกอีกครั้ง");
      } finally {
        savingRef.current = false;
      }
    });
  }

  if (!allowed) {
    if (!managing) return null;
    return (
      <p role={allowed === null ? "status" : "alert"} className="text-sm leading-6">
        {allowed === null
          ? "กำลังตรวจสอบสิทธิ์ผู้ดูแลระบบ..."
          : "ไม่สามารถยืนยันสิทธิ์ผู้ดูแลระบบที่ใช้งานอยู่ได้ กรุณาเข้าสู่ระบบใหม่แล้วลองอีกครั้ง"}
      </p>
    );
  }

  return (
    <div className={managing ? undefined : "mt-4 border-t border-[var(--line)] pt-4"}>
      <button
        ref={toggleRef}
        type="button"
        disabled={pending}
        aria-expanded={expanded}
        aria-controls={`${id}-panel`}
        onClick={() => {
          if (expanded) {
            cancel();
            return;
          }
          setName(initialName.trim().slice(0, 200));
          setError("");
          setNotice("");
          setExpanded(true);
        }}
        className="inline-flex min-h-10 items-center gap-2 border border-[var(--line-dark)] bg-white px-4 py-2 text-left text-sm font-semibold text-[var(--ink)] hover:bg-[var(--paper-warm)] disabled:opacity-50"
      >
        <Plus size={18} className="shrink-0" aria-hidden="true" />
        เพิ่มผู้ประกอบการเข้าระบบ (ผู้ดูแลระบบ)
      </button>
      {expanded && (
        <section
          id={`${id}-panel`}
          aria-labelledby={`${id}-heading`}
          aria-busy={pending}
          className="mt-4 border border-[var(--line)] bg-[var(--paper-warm)] p-4"
        >
          <h4 id={`${id}-heading`} className="font-bold">
            เพิ่มรายชื่อผู้ประกอบการกลาง
          </h4>
          <p id={`${id}-hint`} className="mt-1 text-sm leading-6 text-stone-600">
            รายชื่อนี้จะค้นหาและเลือกใช้ในคำขออื่นได้ด้วย กรุณาตรวจสอบชื่อให้ถูกต้องก่อนบันทึก
            การเพิ่มรายชื่อไม่ใช่การรับรองเอกสารของผู้ประกอบการ
          </p>
          <label htmlFor={`${id}-name`} className="mb-2 mt-4 block text-sm font-semibold">
            ชื่อผู้ประกอบการ/ร้านค้า{" "}
            <span aria-hidden="true" className="text-[var(--red)]">
              *
            </span>
          </label>
          <input
            ref={nameRef}
            id={`${id}-name`}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setError("");
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                event.preventDefault();
                save();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                event.stopPropagation();
                cancel();
              }
            }}
            maxLength={200}
            disabled={pending}
            aria-required="true"
            aria-invalid={Boolean(error)}
            aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
            autoComplete="off"
            className="min-h-11 w-full border border-[var(--line-dark)] bg-white px-3 text-[var(--ink)] disabled:opacity-60"
          />
          {error && (
            <p
              id={`${id}-error`}
              role="alert"
              className="mt-2 break-words text-sm font-semibold text-[var(--red)]"
            >
              {error}
            </p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={save}
              className="inline-flex min-h-10 items-center gap-2 border border-[var(--orange-dark)] bg-[var(--orange)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--orange-dark)] disabled:opacity-60"
            >
              {pending ? (
                <LoaderCircle size={17} className="animate-spin" aria-hidden="true" />
              ) : (
                <Save size={17} aria-hidden="true" />
              )}
              {pending
                ? "กำลังบันทึก..."
                : managing
                  ? "บันทึกผู้ประกอบการ"
                  : "บันทึกและเลือกผู้ประกอบการ"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={cancel}
              className="min-h-10 border border-[var(--line-dark)] bg-white px-4 py-2 text-sm font-semibold hover:bg-stone-100 disabled:opacity-60"
            >
              ยกเลิก
            </button>
          </div>
        </section>
      )}
      {notice && (
        <p role="status" className="mt-3 break-words text-sm leading-6 text-[var(--green)]">
          {notice}
        </p>
      )}
    </div>
  );
}
