import Link from "next/link";
import { ListLinkLabel } from "./list-link-label";
import { LIST_PAGE_SIZE, listHref, pageCount, type ListFilters } from "@/lib/pagination";

export function ListNavigation({
  path,
  filters,
  page,
  total,
  shown,
}: {
  path: string;
  filters: ListFilters;
  page: number;
  total: number;
  shown: number;
}) {
  const pages = pageCount(total);
  const control = "inline-flex min-h-11 items-center border border-[var(--line)] px-3";
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] p-4 text-sm">
      <p role="status">
        แสดง {shown ? (page - 1) * LIST_PAGE_SIZE + 1 : 0}–
        {shown ? (page - 1) * LIST_PAGE_SIZE + shown : 0} จาก {total.toLocaleString("th-TH")} รายการ
      </p>
      <nav aria-label="แบ่งหน้ารายการ" className="flex flex-wrap items-center gap-2">
        {page > 1 ? (
          <Link prefetch={false} className={control} href={listHref(path, filters, page - 1)}>
            <ListLinkLabel>ก่อนหน้า</ListLinkLabel>
          </Link>
        ) : (
          <span aria-disabled="true" className={`${control} opacity-40`}>
            ก่อนหน้า
          </span>
        )}
        <span className="tabular-nums">
          หน้า {page} / {pages}
        </span>
        {page < pages ? (
          <Link prefetch={false} className={control} href={listHref(path, filters, page + 1)}>
            <ListLinkLabel>ถัดไป</ListLinkLabel>
          </Link>
        ) : (
          <span aria-disabled="true" className={`${control} opacity-40`}>
            ถัดไป
          </span>
        )}
      </nav>
    </div>
  );
}
