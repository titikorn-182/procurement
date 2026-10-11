import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { PageHeader } from "../components/ui";
import { getPaymentPage } from "@/features/payments/server/list-queries";
import { paymentStatusLabels } from "@/features/payments/model";
import { parseListFilters, type ListSearchParams } from "@/lib/pagination";
import { PaymentsList } from "./payments-list";
import { getCurrentProfile } from "../lib/live-data";

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams: Promise<ListSearchParams>;
}) {
  const filters = {
    ...parseListFilters(await searchParams, Object.keys(paymentStatusLabels)),
    kind: "all",
  };
  const [result, profile] = await Promise.all([getPaymentPage(filters), getCurrentProfile()]);
  return (
    <AppShell>
      <PageHeader
        title="คำขอเบิกจ่าย POL-02"
        description="ติดตามคำขอเบิกจ่าย เอกสารแนบ และผลการพิจารณาตามสิทธิ์ของคุณ"
        action={
          profile && ["user", "admin"].includes(profile.role) ? (
            <Link
              href="/payments/new"
              className="inline-flex min-h-11 items-center justify-center border border-[var(--orange-dark)] bg-[var(--orange)] px-4 font-semibold text-white"
            >
              สร้างคำขอเบิกจ่าย
            </Link>
          ) : undefined
        }
      />
      <PaymentsList
        key={JSON.stringify(filters)}
        rows={result.rows}
        filters={filters}
        page={result.page}
        total={result.total}
        error={result.error}
      />
    </AppShell>
  );
}
