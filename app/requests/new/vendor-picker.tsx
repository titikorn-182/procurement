"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Check, Search, Store, X } from "lucide-react";
import { searchVendors, type VendorSearchItem, type VendorSearchResult } from "./actions";

export type VendorChoice =
  | { kind: "none" }
  | { kind: "registered"; vendorId: string; vendorName: string }
  | { kind: "new" };

type VendorPickerProps = {
  value: VendorChoice;
  onChange: (value: VendorChoice) => void;
  newVendorName: string;
  onNewVendorNameChange: (value: string) => void;
  required?: boolean;
  errorMessage?: string;
};

const fieldClass =
  "min-h-11 w-full border border-[var(--line-dark)] bg-white px-3 text-[var(--ink)] outline-none transition placeholder:text-stone-500 hover:border-stone-900 focus:border-[var(--blue)] focus:ring-2 focus:ring-blue-100";

function characterCount(value: string) {
  return Array.from(value.trim()).length;
}

export function VendorPicker({
  value,
  onChange,
  newVendorName,
  onNewVendorNameChange,
  required = false,
  errorMessage,
}: VendorPickerProps) {
  const selectedVendorId = value.kind === "registered" ? value.vendorId : null;
  const selectedVendorName = value.kind === "registered" ? value.vendorName : null;
  const selectedVendor = selectedVendorId && selectedVendorName
    ? { id: selectedVendorId, name: selectedVendorName }
    : null;
  const [query, setQuery] = useState(selectedVendor?.name ?? "");
  const [results, setResults] = useState<VendorSearchItem[]>(selectedVendor ? [selectedVendor] : []);
  const [total, setTotal] = useState(selectedVendor ? 1 : 0);
  const [source, setSource] = useState<VendorSearchResult["source"]>("database");
  const [searchError, setSearchError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [searchScheduled, setSearchScheduled] = useState(false);
  const [isSearching, startSearchTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const requestSequence = useRef(0);
  const trimmedQuery = query.trim();
  const queryTooShort = characterCount(query) < 2;
  const activeVendor = results[activeIndex];

  useEffect(() => {
    if (selectedVendorId && selectedVendorName && trimmedQuery === selectedVendorName) return;
    if (queryTooShort) return;

    const sequence = ++requestSequence.current;
    const timer = window.setTimeout(() => {
      startSearchTransition(async () => {
        try {
          const result = await searchVendors(trimmedQuery);
          if (sequence !== requestSequence.current) return;
          setResults(result.vendors);
          setTotal(result.total);
          setSource(result.source);
          setSearchError(result.error);
          setActiveIndex(0);
        } catch {
          if (sequence !== requestSequence.current) return;
          setResults([]);
          setTotal(0);
          setSource("unavailable");
          setSearchError("ค้นหาฐานรายชื่อไม่สำเร็จ กรุณาลองอีกครั้งหรือเลือกผู้ประกอบการรายใหม่");
        } finally {
          if (sequence === requestSequence.current) setSearchScheduled(false);
        }
      });
    }, 300);

    return () => window.clearTimeout(timer);
  }, [queryTooShort, selectedVendorId, selectedVendorName, trimmedQuery]);

  function chooseRegistered(vendor: VendorSearchItem) {
    requestSequence.current += 1;
    setQuery(vendor.name);
    setResults([vendor]);
    setTotal(1);
    setOpen(false);
    setActiveIndex(0);
    setSearchScheduled(false);
    onNewVendorNameChange("");
    onChange({ kind: "registered", vendorId: vendor.id, vendorName: vendor.name });
    inputRef.current?.focus();
  }

  function chooseNew() {
    requestSequence.current += 1;
    const proposedName = query.trim();
    if (proposedName && !newVendorName.trim()) onNewVendorNameChange(proposedName);
    setOpen(false);
    setSearchScheduled(false);
    onChange({ kind: "new" });
  }

  function returnToDirectory() {
    requestSequence.current += 1;
    setQuery("");
    setResults([]);
    setTotal(0);
    setSearchError(null);
    setSearchScheduled(false);
    onChange({ kind: "none" });
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }

  if (value.kind === "new") {
    return (
      <div className="mt-4 border border-amber-300 bg-amber-50 p-4">
        <div className="flex items-start gap-3">
          <Store className="mt-0.5 shrink-0 text-amber-800" size={19} aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-amber-950">ผู้ประกอบการรายใหม่</h4>
            <p className="mt-1 text-sm leading-6 text-amber-900">ใช้เมื่อค้นหาแล้วไม่พบชื่อผู้ประกอบการหรือร้านค้าในระบบ</p>
          </div>
        </div>
        <label className="mt-4 block" htmlFor="new-vendor-name">
          <span className="mb-2 block text-sm font-semibold text-slate-800">ชื่อผู้ประกอบการ/ร้านค้ารายใหม่ <span className="text-red-600">*</span></span>
          <input
            id="new-vendor-name"
            className={fieldClass}
            value={newVendorName}
            onChange={(event) => onNewVendorNameChange(event.target.value)}
            placeholder="กรอกชื่อผู้ประกอบการหรือร้านค้า"
            maxLength={200}
            required
            aria-invalid={Boolean(errorMessage) || undefined}
            aria-describedby={errorMessage ? "new-vendor-document-hint vendor-selection-error" : "new-vendor-document-hint"}
          />
        </label>
        {errorMessage && <p id="vendor-selection-error" role="alert" className="mt-2 text-sm font-semibold text-red-700">{errorMessage}</p>}
        <p id="new-vendor-document-hint" className="mt-3 text-sm font-semibold leading-6 text-amber-950">ต้องแนบเอกสารของร้านค้า/ผู้รับจ้างเพิ่มเติมในขั้นตอนเอกสารแนบ</p>
        <button type="button" className="mt-4 min-h-10 border border-amber-700 bg-white px-4 text-sm font-semibold text-amber-950 transition hover:bg-amber-100" onClick={returnToDirectory}>กลับไปค้นหารายชื่อในระบบ</button>
      </div>
    );
  }

  const searchStatus = queryTooShort
    ? "พิมพ์อย่างน้อย 2 ตัวอักษร"
    : searchScheduled || isSearching
      ? "กำลังค้นหา..."
      : searchError
        ? "ค้นหาไม่สำเร็จ"
        : `พบ ${total.toLocaleString("th-TH")} รายชื่อ`;

  return (
    <div className="mt-4">
      <div
        className="relative"
        onBlur={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
        }}
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <label htmlFor="vendor-search" className="text-sm font-semibold text-slate-700">ค้นหาผู้ประกอบการ/ร้านค้า {required && <span className="text-red-600">*</span>}</label>
          <span className="text-xs text-stone-500" aria-live="polite">{searchStatus}</span>
        </div>
        <div className="relative mt-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" size={18} aria-hidden="true" />
          <input
            ref={inputRef}
            id="vendor-search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls="vendor-search-results"
            aria-activedescendant={open && activeVendor ? `vendor-option-${activeVendor.id}` : undefined}
            aria-required={required}
            aria-invalid={Boolean(errorMessage) || undefined}
            aria-describedby={errorMessage ? "vendor-search-hint vendor-selection-error" : "vendor-search-hint"}
            className={`${fieldClass} pl-10 pr-11`}
            value={query}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              requestSequence.current += 1;
              const nextQuery = event.target.value;
              setQuery(nextQuery);
              setOpen(true);
              setActiveIndex(0);
              setResults([]);
              setTotal(0);
              setSearchError(null);
              if (characterCount(nextQuery) < 2) {
                setSearchScheduled(false);
              } else {
                setSearchScheduled(true);
              }
              if (value.kind === "registered") onChange({ kind: "none" });
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setOpen(true);
                setActiveIndex((current) => Math.min(current + (open ? 1 : 0), Math.max(results.length - 1, 0)));
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setOpen(true);
                setActiveIndex((current) => Math.max(current - 1, 0));
              } else if (event.key === "Enter" && open && activeVendor) {
                event.preventDefault();
                chooseRegistered(activeVendor);
              } else if (event.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder="พิมพ์ชื่อร้าน บริษัท หรือชื่อผู้ประกอบการ"
            autoComplete="off"
            maxLength={120}
          />
          {query && (
            <button
              type="button"
              className="absolute right-1 top-1/2 grid size-9 -translate-y-1/2 place-items-center text-stone-500 hover:bg-stone-100 hover:text-stone-900"
              aria-label="ล้างคำค้นหาและผู้ประกอบการที่เลือก"
              onClick={() => {
                requestSequence.current += 1;
                setQuery("");
                setResults([]);
                setTotal(0);
                setOpen(true);
                setActiveIndex(0);
                setSearchScheduled(false);
                onChange({ kind: "none" });
                inputRef.current?.focus();
              }}
            >
              <X size={17} aria-hidden="true" />
            </button>
          )}
        </div>
        <p id="vendor-search-hint" className="mt-2 text-xs leading-5 text-stone-500">พิมพ์อย่างน้อย 2 ตัวอักษร ระบบจะแสดงผลการค้นหาสูงสุดครั้งละ 20 รายชื่อ</p>
        {errorMessage && <p id="vendor-selection-error" role="alert" className="mt-2 text-sm font-semibold text-red-700">{errorMessage}</p>}
        {searchError && <p role="status" className="mt-2 border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-950">{searchError}</p>}
        {source === "local" && !searchError && !queryTooShort && !searchScheduled && !isSearching && (
          <p role="status" className="mt-2 border border-blue-200 bg-blue-50 px-3 py-2 text-xs leading-5 text-blue-900">กำลังใช้ฐานรายชื่อส่วนตัวในเครื่องระหว่างรอติดตั้งตารางผู้ขายบน Supabase</p>
        )}

        {open && !queryTooShort && (
          <ul id="vendor-search-results" role="listbox" className="absolute z-30 mt-2 max-h-72 w-full overflow-y-auto border border-[var(--line-dark)] bg-white shadow-lg">
            {searchScheduled || isSearching ? (
              <li role="presentation" className="px-4 py-5 text-center text-sm text-stone-600">กำลังค้นหารายชื่อ...</li>
            ) : results.length > 0 ? results.map((vendor, index) => (
              <li key={vendor.id} role="presentation">
                <button
                  id={`vendor-option-${vendor.id}`}
                  type="button"
                  role="option"
                  aria-selected={value.kind === "registered" && value.vendorId === vendor.id}
                  tabIndex={-1}
                  className={`flex min-h-11 w-full items-center gap-3 border-b border-[var(--line)] px-3 py-2 text-left text-sm last:border-b-0 ${index === activeIndex ? "bg-orange-50 text-slate-950" : "bg-white text-slate-800 hover:bg-stone-50"}`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => chooseRegistered(vendor)}
                >
                  <span className="min-w-0 flex-1 break-words">{vendor.name}</span>
                  {value.kind === "registered" && value.vendorId === vendor.id && <Check className="shrink-0 text-emerald-700" size={17} aria-hidden="true" />}
                </button>
              </li>
            )) : (
              <li role="presentation" className="px-4 py-5 text-center text-sm text-stone-600">ไม่พบรายชื่อที่ตรงกับ “{trimmedQuery}”</li>
            )}
          </ul>
        )}
      </div>

      {total > results.length && !searchScheduled && !isSearching && !searchError && <p className="mt-2 text-xs text-stone-500">แสดง 20 รายชื่อแรกจากผลการค้นหา กรุณาพิมพ์เพิ่มเพื่อจำกัดผลลัพธ์</p>}
      {selectedVendor && (
        <div role="status" className="mt-3 flex items-start gap-3 border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-950">
          <Check className="mt-0.5 shrink-0 text-emerald-700" size={18} aria-hidden="true" />
          <p><span className="font-semibold">เลือกแล้ว:</span> {selectedVendor.name}</p>
        </div>
      )}

      <button type="button" className="mt-4 flex min-h-11 w-full items-start gap-3 border border-dashed border-amber-500 bg-amber-50 px-4 py-3 text-left transition hover:border-amber-700 hover:bg-amber-100" onClick={chooseNew}>
        <Store className="mt-0.5 shrink-0 text-amber-800" size={18} aria-hidden="true" />
        <span>
          <span className="block text-sm font-bold text-amber-950">ไม่พบรายชื่อ? ใช้ผู้ประกอบการรายใหม่</span>
          <span className="mt-1 block text-xs leading-5 text-amber-900">ระบบจะแจ้งให้แนบเอกสารของร้านค้า/ผู้รับจ้างในขั้นตอนเอกสารแนบ</span>
        </span>
      </button>
    </div>
  );
}
