import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { PageHeader } from "../components/ui";
import { getCurrentProfile } from "../lib/live-data";
import { getRequestPage } from "@/features/requests/server/list-queries";
import { requestListStatuses } from "@/features/requests/list-model";
import { parseListFilters, type ListSearchParams } from "@/lib/pagination";
import { RequestsList } from "./requests-list";

export default async function RequestsPage({
  searchParams,
}: {
  searchParams: Promise<ListSearchParams>;
}) {
  const filters = parseListFilters(await searchParams, Object.keys(requestListStatuses));
  const [result, profile] = await Promise.all([getRequestPage(filters), getCurrentProfile()]);
  return (
    <AppShell>
      <PageHeader
        title="คำขอหลักการ POL-01"
        description="ค้นหา ติดตาม และส่งออกรายการที่คุณมีสิทธิ์เข้าถึง"
        action={
          profile && ["user", "admin"].includes(profile.role) ? (
            <Link
              href="/requests/new"
              className="inline-flex min-h-11 items-center justify-center border border-[var(--orange-dark)] bg-[var(--orange)] px-4 font-semibold text-white"
            >
              สร้างคำขอใหม่
            </Link>
          ) : undefined
        }
      />
      <RequestsList
        key={JSON.stringify(filters)}
        requests={result.rows}
        filters={filters}
        page={result.page}
        total={result.total}
        error={result.error}
      />
    </AppShell>
  );
}
