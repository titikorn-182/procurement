import Link from "next/link";
import Form from "next/form";
import { AppShell } from "@/app/components/app-shell";
import { PageHeader } from "@/app/components/ui";
import { ListNavigation } from "@/app/components/list-navigation";
import { ListSearchButton } from "@/app/components/list-search-button";
import { canPrepareProcurementDocuments } from "@/features/auth/server/queries";
import { getW804Page } from "@/features/w804/server/queries";
import { w804WorkspaceHref } from "@/features/w804/types";
import { MAX_SEARCH_LENGTH, parseListFilters, type ListSearchParams } from "@/lib/pagination";
import { formatDocumentMoney, formatThaiDocumentDate } from "@/lib/pdf/format";
import { W804_DOCUMENTS } from "../config";

export default async function W804RegistryPage({
  searchParams,
}: {
  searchParams: Promise<ListSearchParams>;
}) {
  const allowed = await canPrepareProcurementDocuments();
  const filters = parseListFilters(await searchParams, []);
  // Never query the registry for a role that cannot prepare these documents.
  const result = allowed ? await getW804Page(filters) : null;
  return (
    <AppShell>
      <PageHeader
        title="ทะเบียนคำขอ ว804"
        description="หนึ่งเลขต่อชุดเอกสารทั้ง 3 รายงาน · ยังไม่เชื่อมสายอนุมัติ"
        action={
          allowed ? (
            <Link
              href="/requests/w804"
              className="inline-flex min-h-11 items-center border border-[var(--orange-dark)] bg-[var(--orange)] px-4 font-semibold text-white"
            >
              สร้างชุดคำขอใหม่
            </Link>
          ) : undefined
        }
      />
      {!result ? (
        <p role="alert" className="mt-6 border border-[var(--line)] bg-white p-5">
          หน้านี้สำหรับผู้ยื่นคำขอและผู้ดูแลระบบที่เปิดใช้งานอยู่ กรุณาตรวจสอบบัญชีที่เข้าสู่ระบบ
        </p>
      ) : (
        <div className="mt-6 min-w-0 border border-[var(--line-dark)] bg-[var(--paper)]">
          <Form
            action="/requests/w804/registry"
            className="flex flex-wrap items-end gap-3 border-b border-[var(--line)] p-4"
          >
            <label className="min-w-0 flex-1 basis-64 text-sm">
              ค้นหาเลขคำขอหรือชื่อเรื่อง
              <input
                name="q"
                defaultValue={filters.q}
                maxLength={MAX_SEARCH_LENGTH}
                placeholder="เช่น W804-001 หรือชื่อรายการจัดซื้อ"
                className="mt-2 min-h-11 w-full border border-[var(--line)] bg-white px-3 text-base"
              />
            </label>
            <ListSearchButton />
            <Link
              href="/requests/w804/registry"
              className="inline-flex min-h-11 items-center px-3 underline"
            >
              ล้างตัวกรอง
            </Link>
          </Form>
          {result.error ? (
            <p role="alert" className="p-5 text-[var(--red)]">
              {result.error} · กดค้นหาเพื่อลองใหม่
            </p>
          ) : (
            <>
              {result.rows.length ? (
                <ul className="divide-y divide-[var(--line)]">
                  {result.rows.map((row) => (
                    <li key={row.id} className="min-w-0 p-4 sm:p-5">
                      <div className="flex flex-wrap items-baseline justify-between gap-x-5 gap-y-2">
                        <h2 className="text-lg font-bold">
                          <Link href={w804WorkspaceHref(row.request_no)} className="underline">
                            {row.request_no}
                          </Link>
                        </h2>
                        <p className="text-sm">
                          วงเงินขอซื้อ {formatDocumentMoney(row.total_amount)} บาท
                        </p>
                      </div>
                      <p className="mt-2 break-words font-semibold [overflow-wrap:anywhere]">
                        {row.title}
                      </p>
                      <p className="mt-1 text-sm text-stone-600">
                        ปีงบประมาณ {row.fiscal_year} · แก้ไขล่าสุด{" "}
                        {formatThaiDocumentDate(row.updated_at.slice(0, 10))} · แบบร่างจัดทำเอกสาร
                      </p>
                      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1">
                        {W804_DOCUMENTS.map(({ id, label }) => (
                          <Link
                            key={id}
                            href={w804WorkspaceHref(row.request_no, id)}
                            className="inline-flex min-h-11 items-center text-sm underline"
                          >
                            {label}
                          </Link>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="p-6 text-sm leading-7">
                  <h2 className="text-base font-bold">
                    {filters.q
                      ? "ไม่พบคำขอที่ตรงกับคำค้น"
                      : "ยังไม่มีคำขอ ว804 ในทะเบียนที่คุณเข้าถึงได้"}
                  </h2>
                  <p>
                    {filters.q
                      ? "ลองเปลี่ยนคำค้นหาหรือล้างตัวกรอง"
                      : "สร้างชุดคำขอ หรือเปิดไฟล์แบบร่างเดิมในหน้าจัดทำเอกสาร แล้วบันทึกทะเบียนเพื่อรับเลข W804"}
                  </p>
                </div>
              )}
              <ListNavigation
                path="/requests/w804/registry"
                filters={filters}
                page={result.page}
                total={result.total}
                shown={result.rows.length}
              />
            </>
          )}
        </div>
      )}
    </AppShell>
  );
}
