"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Save, Upload } from "lucide-react";
import { CatalogImage } from "./catalog-image";
import { saveCatalogItem, uploadCatalogImage } from "./actions";
import { catalogSaveSchema, type CatalogManagementEntry } from "./schema";

const fieldClass =
  "mt-2 min-h-11 w-full min-w-0 border border-[var(--line-dark)] bg-white px-3 py-2 font-normal placeholder:text-stone-600 disabled:bg-stone-100";
const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--line-dark)] bg-white px-4 text-sm font-semibold hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50";

export function CatalogEditor({
  itemId,
  entry,
  categories,
  onCancel,
  onSaved,
  save = saveCatalogItem,
  upload = uploadCatalogImage,
}: {
  itemId: string;
  entry: CatalogManagementEntry | null;
  categories: { code: string; name: string }[];
  onCancel: () => void;
  onSaved: () => void;
  save?: typeof saveCatalogItem;
  upload?: typeof uploadCatalogImage;
}) {
  const [pending, startTransition] = useTransition();
  const [dirty, setDirty] = useState(false);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | undefined>();
  const [imagePath, setImagePath] = useState<string | null>(entry?.image_path ?? null);
  const [uploadedPath, setUploadedPath] = useState<string | null>(null);
  const [renewPrice, setRenewPrice] = useState(false);
  const [phase, setPhase] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const errorSummary = useRef<HTMLParagraphElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    heading.current?.focus();
    heading.current?.scrollIntoView({ block: "start" });
  }, []);
  useEffect(
    () => () => {
      if (preview) URL.revokeObjectURL(preview);
    },
    [preview],
  );
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  function showError(message: string) {
    setError(message);
    requestAnimationFrame(() => errorSummary.current?.focus());
  }
  function selectImage(selected: File | null) {
    if (!selected) return;
    if (
      !["image/jpeg", "image/png", "image/webp"].includes(selected.type) ||
      selected.size > 2 * 1024 * 1024 ||
      !selected.size
    ) {
      showError("กรุณาเลือกรูป JPG, PNG หรือ WebP ขนาดไม่เกิน 2 MB");
      if (fileInput.current) fileInput.current.value = "";
      return;
    }
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setUploadedPath(null);
    setDirty(true);
    setError("");
  }
  function submit(form: HTMLFormElement) {
    const values = new FormData(form);
    const text = (key: string) => String(values.get(key) ?? "").trim();
    const referenceDate = text("reference_date") || null;
    const validUntil = text("valid_until") || null;
    const referencePrice = text("reference_price") === "" ? NaN : Number(text("reference_price"));
    const priceChanged =
      !entry ||
      renewPrice ||
      entry.reference_price !== referencePrice ||
      entry.source_name !== text("source_name") ||
      entry.reference_date !== referenceDate ||
      entry.valid_until !== validUntil ||
      entry.name !== text("name") ||
      entry.specification !== text("specification") ||
      entry.unit !== text("unit");
    const input = {
      item_id: itemId,
      expected_version: entry?.version ?? null,
      item_code: text("item_code"),
      category_code: text("category_code"),
      subcategory: text("subcategory"),
      name: text("name"),
      specification: text("specification"),
      unit: text("unit"),
      notes: text("notes"),
      active: values.get("active") === "on",
      image_path: uploadedPath ?? imagePath,
      price: priceChanged
        ? {
            reference_price: referencePrice,
            source_name: text("source_name"),
            reference_date: referenceDate,
            valid_until: validUntil,
          }
        : null,
    };
    const parsed = catalogSaveSchema.safeParse(input);
    if (!parsed.success) {
      showError(
        "ข้อมูลยังไม่ครบหรือไม่ถูกต้อง กรุณาตรวจชื่อ รหัส หน่วยนับ ราคา และช่วงวันที่อ้างอิง",
      );
      return;
    }
    setError("");
    startTransition(async () => {
      try {
        let nextImagePath = uploadedPath ?? imagePath;
        if (file && !uploadedPath) {
          setPhase("กำลังอัปโหลดรูปประกอบ…");
          const uploadData = new FormData();
          uploadData.set("itemId", itemId);
          uploadData.set("file", file);
          const result = await upload(uploadData);
          if (result.error || !result.path) {
            showError(result.error || "อัปโหลดรูปไม่สำเร็จ กรุณาลองใหม่");
            return;
          }
          nextImagePath = result.path;
          setUploadedPath(result.path);
        }
        setPhase("กำลังบันทึกข้อมูล…");
        const result = await save({ ...parsed.data, image_path: nextImagePath });
        if (result.error || !result.data) {
          showError(result.error || "ยังบันทึกไม่ได้ ข้อมูลที่กรอกยังอยู่ กรุณาลองใหม่");
          return;
        }
        setDirty(false);
        onSaved();
      } catch {
        showError("การเชื่อมต่อขัดข้อง ข้อมูลที่กรอกยังอยู่ กรุณาลองบันทึกอีกครั้ง");
      } finally {
        setPhase("");
      }
    });
  }
  return (
    <section
      aria-labelledby="catalog-editor-heading"
      className="min-w-0 border border-[var(--line-dark)] bg-[var(--paper)]"
    >
      <header className="border-b border-[var(--line)] p-5">
        <h2
          ref={heading}
          tabIndex={-1}
          id="catalog-editor-heading"
          className="scroll-mt-24 text-lg font-bold"
        >
          {entry ? `แก้ไขรายการ ${entry.item_code}` : "เพิ่มรายการพัสดุ"}
        </h2>
        <p className="mt-1 text-sm text-stone-600">
          ช่องที่มี * จำเป็นต้องกรอก ข้อมูลจะใช้ร่วมกับแค็ตตาล็อกในคำขอ POL-01
        </p>
      </header>
      <form
        onChange={() => setDirty(true)}
        onSubmit={(event) => {
          event.preventDefault();
          submit(event.currentTarget);
        }}
        className="space-y-6 p-4 sm:p-6"
      >
        {error && (
          <p
            ref={errorSummary}
            tabIndex={-1}
            role="alert"
            className="border border-red-300 bg-[var(--red-soft)] p-4 text-sm text-[var(--red)]"
          >
            {error}
          </p>
        )}
        <fieldset disabled={pending} className="min-w-0 space-y-6">
          <legend className="sr-only">ข้อมูลพัสดุและราคาอ้างอิง</legend>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <label className="min-w-0 text-sm font-semibold">
              รหัสพัสดุ *
              <input
                name="item_code"
                required
                maxLength={100}
                defaultValue={entry?.item_code ?? ""}
                placeholder="เช่น OFF-003-01"
                className={fieldClass}
              />
            </label>
            <label className="min-w-0 text-sm font-semibold">
              หมวดหลัก *
              <select
                name="category_code"
                required
                defaultValue={entry?.category_code ?? ""}
                className={fieldClass}
              >
                <option value="" disabled>
                  เลือกหมวดหลัก
                </option>
                {categories.map((category) => (
                  <option key={category.code} value={category.code}>
                    {category.name} ({category.code})
                  </option>
                ))}
              </select>
            </label>
            <label className="min-w-0 text-sm font-semibold">
              ชื่อรายการ *
              <input
                name="name"
                required
                maxLength={300}
                defaultValue={entry?.name ?? ""}
                placeholder="เช่น กระดาษถ่ายเอกสาร A4"
                className={fieldClass}
              />
            </label>
            <label className="min-w-0 text-sm font-semibold">
              หมวดย่อย
              <input
                name="subcategory"
                maxLength={100}
                defaultValue={entry?.subcategory ?? ""}
                placeholder="เช่น กระดาษ"
                className={fieldClass}
              />
            </label>
            <label className="min-w-0 text-sm font-semibold sm:col-span-2">
              รายละเอียด / คุณลักษณะ
              <textarea
                name="specification"
                rows={3}
                maxLength={1000}
                defaultValue={entry?.specification ?? ""}
                placeholder="เช่น ขนาด A4 หนา 80 แกรม 500 แผ่นต่อรีม"
                className={fieldClass}
              />
            </label>
            <label className="min-w-0 text-sm font-semibold">
              หน่วยนับ *
              <input
                name="unit"
                required
                maxLength={100}
                defaultValue={entry?.unit ?? ""}
                placeholder="เช่น รีม"
                className={fieldClass}
              />
            </label>
            <label className="flex min-h-11 items-center gap-3 text-sm sm:self-end">
              <input
                type="checkbox"
                name="active"
                defaultChecked={entry?.active ?? true}
                className="h-5 w-5 shrink-0 accent-[var(--orange)]"
              />
              <span>เปิดให้ใช้ในแค็ตตาล็อกคำขอ</span>
            </label>
            <label className="min-w-0 text-sm font-semibold sm:col-span-2">
              หมายเหตุ
              <textarea
                name="notes"
                rows={2}
                maxLength={2000}
                defaultValue={entry?.notes ?? ""}
                placeholder="เช่น ยี่ห้อหรือข้อควรตรวจสอบก่อนซื้อ"
                className={fieldClass}
              />
            </label>
          </div>
          <section
            className="space-y-4 border-t border-[var(--line)] pt-5"
            aria-labelledby="catalog-price-heading"
          >
            <h3 id="catalog-price-heading" className="font-bold">
              ราคาอ้างอิง
            </h3>
            <p className="max-w-3xl text-sm text-stone-700">
              การเปลี่ยนราคา แหล่งราคา ชื่อ คุณลักษณะ หรือหน่วยนับ
              จะบันทึกเป็นราคาเวอร์ชันใหม่ที่ยังไม่รับรอง และเก็บราคาเดิมไว้
              ไม่ใช่การรับรองราคากลางอย่างเป็นทางการ
            </p>
            <div className="grid min-w-0 gap-4 sm:grid-cols-2">
              <label className="min-w-0 text-sm font-semibold">
                ราคาอ้างอิงต่อหน่วย (บาท) *
                <input
                  name="reference_price"
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  max="999999999999.99"
                  defaultValue={entry?.reference_price ?? ""}
                  placeholder="เช่น 119.00"
                  className={fieldClass}
                />
              </label>
              <label className="min-w-0 text-sm font-semibold">
                แหล่งที่มาของราคา *
                <input
                  name="source_name"
                  required
                  maxLength={300}
                  defaultValue={entry?.source_name ?? ""}
                  placeholder="ชื่อร้านค้า หรือเอกสารอ้างอิง"
                  className={fieldClass}
                />
              </label>
              <label className="min-w-0 text-sm font-semibold">
                วันที่อ้างอิงราคา
                <input
                  name="reference_date"
                  type="date"
                  defaultValue={entry?.reference_date ?? ""}
                  className={fieldClass}
                />
                <span className="mt-1 block font-normal text-stone-600">
                  เว้นว่างได้ หากยังไม่มีหลักฐานยืนยันวันที่
                </span>
              </label>
              <label className="min-w-0 text-sm font-semibold">
                ราคาใช้ได้ถึง
                <input
                  name="valid_until"
                  type="date"
                  defaultValue={entry?.valid_until ?? ""}
                  className={fieldClass}
                />
              </label>
            </div>
            {entry && (
              <label className="flex min-h-11 items-center gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={renewPrice}
                  onChange={(event) => setRenewPrice(event.target.checked)}
                  className="h-5 w-5 shrink-0 accent-[var(--orange)]"
                />
                <span>
                  บันทึกเป็นราคาอ้างอิงเวอร์ชันใหม่ แม้ราคาเท่าเดิม
                  {entry.status === "withdrawn" ? " (จำเป็นหากต้องการเปิดใช้ราคาที่เคยถอน)" : ""}
                </span>
              </label>
            )}
          </section>
          <section
            aria-labelledby="catalog-image-heading"
            className="space-y-4 border-t border-[var(--line)] pt-5"
          >
            <h3 id="catalog-image-heading" className="font-bold">
              รูปภาพประกอบ
            </h3>
            <div className="flex min-w-0 flex-col gap-4 sm:flex-row">
              <CatalogImage
                itemId={itemId}
                version={entry?.version ?? 1}
                hasImage={!!imagePath}
                name={entry?.name ?? "รายการใหม่"}
                preview={preview}
              />
              <div className="min-w-0 space-y-3">
                <p className="text-sm text-stone-700">
                  รูปหลัก 1 รูปต่อรายการ · JPG, PNG หรือ WebP ไม่เกิน 2 MB และไม่เกิน 6,000
                  พิกเซลต่อด้าน รวมไม่เกิน 16 ล้านพิกเซล รูปเดิมจะไม่ถูกเขียนทับ
                </p>
                <label
                  className={`${buttonClass} cursor-pointer focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[var(--blue)]`}
                >
                  <Upload size={16} aria-hidden="true" />
                  <span>{imagePath || file ? "เปลี่ยนรูปประกอบ" : "เพิ่มรูปประกอบ"}</span>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    aria-label="เลือกรูปภาพประกอบ"
                    onChange={(event) => selectImage(event.target.files?.[0] ?? null)}
                  />
                </label>
                {file && (
                  <p className="break-all text-sm">
                    {file.name} · {(file.size / 1024).toFixed(0)} KB
                  </p>
                )}
                {(file || imagePath) && (
                  <button
                    type="button"
                    className={`${buttonClass} sm:ml-3`}
                    onClick={() => {
                      setFile(null);
                      setPreview(undefined);
                      setUploadedPath(null);
                      setImagePath(null);
                      setDirty(true);
                      if (fileInput.current) fileInput.current.value = "";
                    }}
                  >
                    ไม่ใช้รูปนี้
                  </button>
                )}
                <p className="text-sm text-stone-600">
                  รูปจะแสดงในแค็ตตาล็อกทั้งสองหน้าหลังบันทึก เฉพาะผู้มีสิทธิ์ใช้งานระบบ
                </p>
              </div>
            </div>
          </section>
        </fieldset>
        {confirmCancel && (
          <div className="space-y-3 border border-amber-300 bg-[var(--amber-soft)] p-4 text-sm text-[var(--amber)]">
            <p>มีข้อมูลที่ยังไม่ได้บันทึก ต้องการทิ้งการแก้ไขนี้หรือไม่?</p>
            <div className="flex flex-wrap gap-3">
              <button type="button" className={buttonClass} disabled={pending} onClick={onCancel}>
                ทิ้งการแก้ไขและกลับรายการ
              </button>
              <button type="button" className={buttonClass} onClick={() => setConfirmCancel(false)}>
                แก้ไขต่อ
              </button>
            </div>
          </div>
        )}
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] pt-5">
          <button
            type="button"
            className={buttonClass}
            disabled={pending}
            onClick={() => (dirty ? setConfirmCancel(true) : onCancel())}
          >
            ยกเลิกและกลับรายการ
          </button>
          <p role="status" className="text-sm text-stone-700">
            {phase}
          </p>
          <button
            type="submit"
            disabled={pending}
            className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--orange-dark)] bg-[var(--orange)] px-4 text-sm font-semibold text-white hover:bg-[var(--orange-dark)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save size={16} aria-hidden="true" />
            {pending ? "กำลังบันทึก…" : "บันทึกข้อมูล"}
          </button>
        </footer>
      </form>
    </section>
  );
}
