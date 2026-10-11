"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { searchProcurementCatalog } from "./catalog-actions";
import {
  catalogItemSnapshot,
  catalogPriceWarning,
  type CatalogEntry,
  type CatalogQuery,
  type CatalogResult,
} from "./catalog-schema";

const fieldClass =
  "min-h-11 min-w-0 w-full border border-[var(--line-dark)] bg-white px-3 text-sm placeholder:text-stone-600 focus:outline-2 focus:outline-offset-2 focus:outline-[var(--blue)]";
const buttonClass =
  "inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--line-dark)] bg-white px-4 text-sm font-semibold hover:bg-stone-100 disabled:cursor-not-allowed disabled:opacity-50";
const money = (value: number) =>
  new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(value);
const dateLabel = (value: string | null) =>
  value
    ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium", timeZone: "Asia/Bangkok" }).format(
        new Date(`${value}T00:00:00+07:00`),
      )
    : "ไม่ระบุใน Excel";

/** Existing operational surface: search → inspect provenance → copy a snapshot.
 * Inherits DESIGN.md; no new visual identity or unverified current-price claims.
 */
export function CatalogPicker({
  onSelect,
  onClose,
  load = searchProcurementCatalog,
}: {
  onSelect: (entry: CatalogEntry) => boolean;
  onClose: () => void;
  load?: (query: CatalogQuery) => Promise<CatalogResult>;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("");
  const [request, setRequest] = useState<CatalogQuery>({ query: "", category: "", page: 0 });
  const [retry, setRetry] = useState(0);
  const [result, setResult] = useState<CatalogResult | null>(null);
  const [categories, setCategories] = useState<{ code: string; name: string }[]>([]);
  const [notice, setNotice] = useState("");
  const [pending, startTransition] = useTransition();
  const searchInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchInput.current?.focus({ preventScroll: true });
    searchInput.current?.closest("section")?.scrollIntoView({ block: "start" });
  }, []);
  useEffect(() => {
    let cancelled = false;
    startTransition(async () => {
      try {
        const next = await load(request);
        if (!cancelled) {
          setResult(next);
          if (next.data) setCategories(next.data.categories);
        }
      } catch {
        if (!cancelled)
          setResult({
            data: null,
            error: "โหลดแค็ตตาล็อกไม่สำเร็จ กรุณาลองใหม่ ข้อมูลคำขอไม่ถูกลบ",
          });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [request, retry, load]);

  const loading = pending || result === null;
  const data = result?.data;
  function runSearch(page = 0) {
    setResult(null);
    setNotice("");
    setRequest({ query: query.trim(), category, page });
  }
  function changePage(page: number) {
    setResult(null);
    setNotice("");
    setRequest({ ...request, page });
  }
  return (
    <section
      id="reference-price-catalog"
      aria-labelledby="reference-price-catalog-heading"
      className="min-w-0 scroll-mt-24 border border-[var(--line-dark)] bg-stone-50"
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <header className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-4 py-3">
        <div className="min-w-0">
          <h3 id="reference-price-catalog-heading" className="font-bold">
            แค็ตตาล็อกราคากลาง
          </h3>
          <p className="mt-1 text-sm text-stone-600">
            ค้นหาข้อมูล Master Data จากฐานข้อมูลพัสดุของคณะรัฐศาสตร์
          </p>
        </div>
        <button
          type="button"
          className={`${buttonClass} shrink-0 px-3`}
          onClick={onClose}
          aria-label="ปิดแค็ตตาล็อกราคากลาง"
        >
          <X size={17} aria-hidden="true" />
        </button>
      </header>
      <div className="space-y-4 p-4">
        <p className="max-w-3xl text-sm text-stone-700">
          เลือกรายการเพื่อเติมชื่อ คุณลักษณะ หน่วยนับ ราคากลาง และแหล่งที่มา
          จำนวนและราคาต่อหน่วยที่ขอซื้อยังต้องกรอกเอง ราคาอ้างอิงไม่ใช่ยอดซื้อจริง
        </p>
        <form
          className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,14rem)_auto] sm:items-end"
          onSubmit={(event) => {
            event.preventDefault();
            runSearch();
          }}
        >
          <label className="min-w-0 text-sm font-semibold">
            ค้นหารหัส ชื่อ หรือคุณลักษณะ
            <input
              ref={searchInput}
              className={`${fieldClass} mt-2 font-normal`}
              value={query}
              maxLength={120}
              placeholder="เช่น กระดาษ A4 หรือ OFF-001"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="min-w-0 text-sm font-semibold">
            หมวดหลัก
            <select
              className={`${fieldClass} mt-2 font-normal`}
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              <option value="">ทุกหมวด</option>
              {categories.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={buttonClass} disabled={loading}>
            <Search size={16} aria-hidden="true" />
            ค้นหา
          </button>
        </form>
        <p role="status" className="text-sm text-stone-700">
          {loading
            ? "กำลังโหลดแค็ตตาล็อก…"
            : notice ||
              (data
                ? `พบ ${data.total} รายการ${data.total ? ` · หน้า ${request.page + 1} จาก ${Math.ceil(data.total / 20)}` : ""}`
                : "")}
        </p>
        {!loading && result?.error && (
          <div
            role="alert"
            className="space-y-3 border border-red-300 bg-[var(--red-soft)] p-4 text-sm text-[var(--red)]"
          >
            <p>{result.error}</p>
            <button
              className={buttonClass}
              type="button"
              onClick={() => {
                setResult(null);
                setRetry((value) => value + 1);
              }}
            >
              ลองโหลดอีกครั้ง
            </button>
          </div>
        )}
        {!loading && data && !data.items.length && (
          <div className="border border-[var(--line)] bg-white p-5 text-sm">
            <p className="font-semibold">
              {request.query || request.category
                ? "ไม่พบรายการที่ตรงกับการค้นหา"
                : "ยังไม่มีรายการราคาที่เปิดให้เลือก"}
            </p>
            <p className="mt-2 text-stone-600">
              {request.query || request.category
                ? "ลองเปลี่ยนคำค้นหรือเลือกทุกหมวด สามารถกรอกรายการเองได้ตามเดิม"
                : "ให้ผู้ดูแลตรวจการนำเข้า Master Data และสถานะรายการ ประวัติการซื้อที่ไม่มีราคาจะไม่แสดงแทนราคากลาง"}
            </p>
          </div>
        )}
        {!loading && !!data?.items.length && (
          <ul className="divide-y divide-[var(--line)] border border-[var(--line)] bg-white">
            {data.items.map((entry) => (
              <li
                key={entry.price_id}
                className="grid min-w-0 gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,19rem)_auto]"
              >
                <div className="min-w-0 break-words">
                  <h4 className="font-semibold">{entry.name}</h4>
                  <p className="mt-1 text-sm text-stone-600">
                    {entry.item_code} · {entry.category_name} / {entry.subcategory}
                  </p>
                  <p className="mt-2 text-sm">{entry.specification}</p>
                  {entry.notes && (
                    <p className="mt-1 text-sm text-stone-600">หมายเหตุจาก Excel: {entry.notes}</p>
                  )}
                  <details className="mt-3 text-sm text-stone-600">
                    <summary className="min-h-10 cursor-pointer py-2 underline underline-offset-4">
                      ดูแหล่งข้อมูลต้นฉบับ
                    </summary>
                    <p className="break-words [overflow-wrap:anywhere]">
                      {entry.file_name} · {entry.sheet_name} · แถว {entry.row_number}
                    </p>
                  </details>
                </div>
                <div className="min-w-0 break-words text-sm">
                  <p className="text-base font-bold tabular-nums">
                    {money(entry.reference_price)} / {entry.unit}
                  </p>
                  <p className="mt-1 text-stone-600">ราคาอ้างอิงจาก Excel</p>
                  <p className="mt-2">แหล่งราคา: {entry.source_name}</p>
                  <p className="mt-1">วันที่อ้างอิง: {dateLabel(entry.reference_date)}</p>
                  {entry.valid_until && (
                    <p className="mt-1">ใช้ได้ถึง: {dateLabel(entry.valid_until)}</p>
                  )}
                  <p className="mt-2 font-semibold text-[var(--orange-dark)]">
                    {catalogPriceWarning(entry)}
                  </p>
                </div>
                <div className="lg:self-center">
                  <button
                    type="button"
                    className={`${buttonClass} w-full`}
                    disabled={!catalogItemSnapshot(entry)}
                    aria-label={`เลือกรายการ ${entry.item_code} ${entry.name}`}
                    onClick={() =>
                      setNotice(
                        onSelect(entry)
                          ? `เพิ่ม ${entry.item_code} ในรายการคำขอแล้ว กรุณากรอกจำนวนและราคาต่อหน่วย`
                          : "เพิ่มไม่ได้: คำขอมีครบ 200 รายการ หรือข้อมูลยาวเกินช่องที่รองรับ",
                      )
                    }
                  >
                    เลือกรายการ
                  </button>
                  {!entry.expired && !catalogItemSnapshot(entry) && (
                    <p className="mt-2 max-w-48 text-sm text-[var(--red)]">
                      ข้อมูลยาวเกินช่องคำขอ กรุณากรอกเอง
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
        {!loading && data && data.total > 20 && (
          <nav aria-label="หน้าผลการค้นหา" className="flex flex-wrap justify-between gap-3">
            <button
              type="button"
              className={buttonClass}
              disabled={request.page === 0}
              onClick={() => changePage(request.page - 1)}
            >
              หน้าก่อนหน้า
            </button>
            <button
              type="button"
              className={buttonClass}
              disabled={(request.page + 1) * 20 >= data.total}
              onClick={() => changePage(request.page + 1)}
            >
              หน้าถัดไป
            </button>
          </nav>
        )}
      </div>
    </section>
  );
}
