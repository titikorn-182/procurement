import Link from "next/link";
import Form from "next/form";
import { Search } from "lucide-react";
import { StatusBadge } from "../components/ui";
import type { RequestRow } from "@/features/requests/types";
export type { RequestRow } from "@/features/requests/types";
import { ListNavigation } from "../components/list-navigation";
import { ListSearchButton } from "../components/list-search-button";
import { requestListStatuses } from "@/features/requests/list-model";
import { MAX_SEARCH_LENGTH, type ListFilters } from "@/lib/pagination";
import { RequestExportButton } from "./request-export-button";

export function RequestsList({
  requests,
  filters,
  page,
  total,
  error,
}: {
  requests: RequestRow[];
  filters: ListFilters;
  page: number;
  total: number;
  error: string | null;
}) {
  return (
    <div className="mt-6 min-w-0 border border-[var(--line-dark)] bg-[var(--paper)]">
      <Form
        action="/requests"
        className="flex flex-col gap-3 border-b border-[var(--line)] p-4 xl:flex-row xl:flex-wrap xl:items-center"
      >
        <label className="relative min-w-0 flex-1 lg:max-w-md">
          <span className="sr-only">ค้นหาคำขอ</span>
          <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500" />
          <input
            name="q"
            defaultValue={filters.q}
            maxLength={MAX_SEARCH_LENGTH}
            className="min-h-11 w-full border border-[var(--line)] pl-9 pr-3 text-base"
            placeholder="ค้นหาเลขคำขอ ชื่อเรื่อง หรือหน่วยงาน"
          />
        </label>
        <select
          aria-label="กรองประเภท"
          name="kind"
          defaultValue={filters.kind}
          className="min-h-11 border border-[var(--line-dark)] bg-white px-3 text-base"
        >
          <option value="all">ทุกประเภท</option>
          <option value="purchase">จัดซื้อ</option>
          <option value="hire">จัดจ้าง</option>
        </select>
        <select
          aria-label="กรองสถานะ"
          name="status"
          defaultValue={filters.status}
          className="min-h-11 border border-[var(--line-dark)] bg-white px-3 text-base"
        >
          <option value="all">ทุกสถานะ</option>
          {Object.entries(requestListStatuses).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <ListSearchButton />
        <Link
          href="/requests"
          className="inline-flex min-h-11 items-center justify-center px-3 underline"
        >
          ล้างตัวกรอง
        </Link>
      </Form>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] p-4">
        <p className="text-sm text-stone-600">
          เลือกตัวกรองแล้วกดค้นหา · CSV ใช้ผลการค้นหาที่แสดงล่าสุด
        </p>
        <RequestExportButton filters={filters} disabled={!total || !!error} />
      </div>
      {error ? (
        <p role="alert" className="p-4 text-[var(--red)]">
          {error} · กดค้นหาเพื่อลองใหม่
        </p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] border-collapse text-left">
              <thead className="bg-stone-100">
                <tr>
                  {[
                    "เลขที่คำขอ",
                    "ประเภท",
                    "ชื่อเรื่อง",
                    "วันที่สร้าง",
                    "วงเงิน (บาท)",
                    "สถานะ",
                    "ขั้นตอนปัจจุบัน",
                    "",
                  ].map((h) => (
                    <th
                      key={h}
                      className="border-b border-r border-[var(--line)] px-4 py-3 text-xs font-bold last:border-r-0"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.length ? (
                  requests.map((r) => (
                    <tr key={r.id} className="hover:bg-orange-50/60">
                      <td className="border-b border-r border-[var(--line)] px-4 py-4 font-bold">
                        {r.id}
                      </td>
                      <td className="border-b border-r border-[var(--line)] px-4 py-4">{r.type}</td>
                      <td className="max-w-sm border-b border-r border-[var(--line)] px-4 py-4">
                        <div className="font-semibold">{r.title}</div>
                        <div className="mt-1 text-xs text-stone-500">{r.unit}</div>
                      </td>
                      <td className="border-b border-r border-[var(--line)] px-4 py-4">{r.date}</td>
                      <td className="border-b border-r border-[var(--line)] px-4 py-4 text-right tabular-nums">
                        {r.amount.toLocaleString("th-TH", { minimumFractionDigits: 2 })}
                      </td>
                      <td className="border-b border-r border-[var(--line)] px-4 py-4">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="border-b border-r border-[var(--line)] px-4 py-4">{r.step}</td>
                      <td className="border-b border-[var(--line)] px-4 py-4">
                        <Link
                          href={`/requests/${encodeURIComponent(r.id)}`}
                          className="inline-flex min-h-9 items-center border border-[var(--line-dark)] px-3 font-semibold hover:bg-stone-100"
                        >
                          ดูรายละเอียด
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="p-10 text-center text-stone-600">
                      ไม่พบคำขอที่ตรงกับตัวกรอง
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <ListNavigation
            path="/requests"
            filters={filters}
            page={page}
            total={total}
            shown={requests.length}
          />
        </>
      )}
    </div>
  );
}
