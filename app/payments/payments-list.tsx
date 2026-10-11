import Link from "next/link";
import Form from "next/form";
import { ListNavigation } from "../components/list-navigation";
import { ListSearchButton } from "../components/list-search-button";
import { MAX_SEARCH_LENGTH, type ListFilters } from "@/lib/pagination";
import { inputClass } from "../components/ui";
import type { PaymentRow } from "./data";
import { dateText, money, paymentHref, paymentStatusLabels } from "./payment-model";

export function PaymentsList({
  rows,
  filters,
  page,
  total,
  error,
}: {
  rows: PaymentRow[];
  filters: ListFilters;
  page: number;
  total: number;
  error: string | null;
}) {
  const hasFilters = !!filters.q || filters.status !== "all";
  return (
    <section
      className="mt-6 min-w-0 border border-[var(--line-dark)] bg-[var(--paper)]"
      aria-label="รายการคำขอเบิกจ่าย"
    >
      <Form
        action="/payments"
        className="flex flex-col gap-3 border-b border-[var(--line)] p-4 xl:flex-row xl:items-end"
      >
        <label className="min-w-0 flex-1">
          <span className="mb-1 block text-sm font-semibold">ค้นหาเลขคำขอ เรื่อง หรือผู้ยื่น</span>
          <input
            className={inputClass}
            name="q"
            defaultValue={filters.q}
            maxLength={MAX_SEARCH_LENGTH}
            placeholder="เช่น POL02 หรือชื่อโครงการ"
          />
        </label>
        <label>
          <span className="mb-1 block text-sm font-semibold">สถานะ</span>
          <select className={inputClass} name="status" defaultValue={filters.status}>
            <option value="all">ทุกสถานะ</option>
            {Object.entries(paymentStatusLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <ListSearchButton />
        <Link
          href="/payments"
          className="inline-flex min-h-11 items-center justify-center px-3 underline"
        >
          ล้างตัวกรอง
        </Link>
      </Form>
      {error ? (
        <p role="alert" className="p-4 text-[var(--red)]">
          {error} · กดค้นหาเพื่อลองใหม่
        </p>
      ) : (
        <>
          <div className="divide-y divide-[var(--line)]">
            {rows.map((row) => (
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
          {!rows.length && (
            <div className="p-8 text-center">
              <p className="font-semibold">
                {hasFilters ? "ไม่พบคำขอตามเงื่อนไข" : "ยังไม่มีคำขอเบิกจ่ายที่คุณเข้าถึงได้"}
              </p>
              <p className="mt-2 text-sm text-stone-600">
                {hasFilters
                  ? "ลองเปลี่ยนคำค้นหรือเลือกทุกสถานะ"
                  : "สร้าง POL-02 จากคำขอหลักการที่อนุมัติแล้ว"}
              </p>
            </div>
          )}
          <ListNavigation
            path="/payments"
            filters={filters}
            page={page}
            total={total}
            shown={rows.length}
          />
        </>
      )}
    </section>
  );
}
