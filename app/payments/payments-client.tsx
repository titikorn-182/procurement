"use client";
import Link from "next/link";
import { useState } from "react";
import { inputClass } from "../components/ui";
import type { PaymentRow } from "./data";
import { dateText, money, paymentHref, paymentStatusLabels } from "./payment-model";

export function PaymentsClient({
  rows,
  initialQuery = "",
}: {
  rows: PaymentRow[];
  initialQuery?: string;
}) {
  const [query, setQuery] = useState(initialQuery),
    [status, setStatus] = useState("all"),
    [page, setPage] = useState(1);
  const filtered = rows.filter(
    (row) =>
      (status === "all" || row.status === status) &&
      `${row.paymentNo} ${row.sourceNo} ${row.subject} ${row.requester} ${row.department}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  const pages = Math.max(1, Math.ceil(filtered.length / 10)),
    current = Math.min(page, pages);
  return (
    <section
      className="mt-6 min-w-0 border border-[var(--line-dark)] bg-[var(--paper)]"
      aria-label="รายการคำขอเบิกจ่าย"
    >
      <div className="grid gap-3 border-b border-[var(--line)] p-4 sm:grid-cols-[minmax(0,1fr)_auto]">
        <label className="min-w-0">
          <span className="mb-1 block text-sm font-semibold">ค้นหาเลขคำขอ เรื่อง หรือผู้ยื่น</span>
          <input
            className={inputClass}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder="เช่น POL02 หรือชื่อโครงการ"
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold">สถานะ</span>
          <select
            className={inputClass}
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">ทุกสถานะ</option>
            {Object.entries(paymentStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="px-4 py-3 text-sm text-stone-600" role="status">
        พบ {filtered.length} รายการ · หน้า {current} จาก {pages}
        {rows.length >= 1000 ? " · แสดงเฉพาะ 1,000 รายการล่าสุด" : ""}
      </p>
      <div className="divide-y divide-[var(--line)]">
        {filtered.slice((current - 1) * 10, current * 10).map((row) => (
          <Link
            key={row.id}
            href={paymentHref(row.paymentNo)}
            className="grid gap-3 p-4 hover:bg-orange-50 sm:grid-cols-[minmax(0,1fr)_auto]"
          >
            <div className="min-w-0 break-words">
              <div className="flex flex-wrap items-center gap-2">
                <strong>{row.paymentNo}</strong>
                <span className="border border-[var(--line)] bg-stone-100 px-2 py-1 text-xs">
                  {paymentStatusLabels[row.status] ?? row.status}
                </span>
              </div>
              <h2 className="mt-2 font-semibold">{row.subject || "คำขอเบิกจ่าย"}</h2>
              <p className="mt-1 text-sm text-stone-600">
                {row.requester} · {row.department}
              </p>
              <p className="mt-1 text-xs text-stone-600">
                อ้างอิง {row.sourceNo || "—"} · {dateText(row.createdAt)}
              </p>
            </div>
            <div className="self-center sm:text-right">
              <p className="font-bold tabular-nums">{money(row.amount)} บาท</p>
              <span className="mt-2 inline-block text-sm font-semibold text-[var(--orange-dark)] underline">
                เปิดรายละเอียด
              </span>
            </div>
          </Link>
        ))}
      </div>
      {!filtered.length && (
        <div className="p-8 text-center">
          <p className="font-semibold">
            {rows.length ? "ไม่พบคำขอตามเงื่อนไข" : "ยังไม่มีคำขอเบิกจ่ายที่คุณเข้าถึงได้"}
          </p>
          <p className="mt-2 text-sm text-stone-600">
            {rows.length
              ? "ลองเปลี่ยนคำค้นหรือเลือกทุกสถานะ"
              : "สร้าง POL-02 จากคำขอหลักการที่อนุมัติแล้ว"}
          </p>
        </div>
      )}
      <nav
        aria-label="หน้ารายการเบิกจ่าย"
        className="flex items-center justify-between gap-3 border-t border-[var(--line)] p-4"
      >
        <button
          className="min-h-11 border px-3 disabled:opacity-40"
          disabled={current <= 1}
          onClick={() => setPage(current - 1)}
        >
          ก่อนหน้า
        </button>
        <span className="text-sm">
          {current} / {pages}
        </span>
        <button
          className="min-h-11 border px-3 disabled:opacity-40"
          disabled={current >= pages}
          onClick={() => setPage(current + 1)}
        >
          ถัดไป
        </button>
      </nav>
    </section>
  );
}
