import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { PageHeader } from "../components/ui";
import { GlobalSearch } from "../components/global-search";
import { getRequests } from "../lib/live-data";
import { getPayments } from "../payments/data";
import { money, paymentHref, paymentStatusLabels } from "../payments/payment-model";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const params = await searchParams,
    q = (typeof params.q === "string" ? params.q : "").trim().slice(0, 200);
  const [requests, payments] = q
    ? await Promise.all([getRequests(), getPayments()])
    : [
        { rows: [], error: null },
        { rows: [], error: null },
      ];
  const rows = [
    ...requests.rows.map((row) => ({
      id: row.id,
      title: row.title,
      requester: row.requester,
      unit: row.unit,
      status: row.status,
      amount: row.amount,
      href: `/requests/${encodeURIComponent(row.id)}`,
    })),
    ...payments.rows.map((row) => ({
      id: row.paymentNo,
      title: row.subject,
      requester: row.requester,
      unit: row.department,
      status: paymentStatusLabels[row.status] ?? row.status,
      amount: row.amount,
      href: paymentHref(row.paymentNo),
    })),
  ].filter((row) =>
    `${row.id} ${row.title} ${row.requester} ${row.unit}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <AppShell>
      <PageHeader
        title="ค้นหาคำขอ"
        description="ค้นหาคำขอหลักการและเบิกจ่ายตามสิทธิ์ของคุณ · ไม่เกิน 1,000 รายการล่าสุดต่อประเภท"
      />
      <div className="mt-5">
        <GlobalSearch key={q} defaultValue={q} />
      </div>
      {(requests.error || payments.error) && (
        <p role="alert" className="mt-4 border p-4 text-[var(--red)]">
          {requests.error || payments.error}
        </p>
      )}
      <section
        className="mt-5 divide-y border border-[var(--line-dark)] bg-[var(--paper)]"
        aria-label="ผลการค้นหา"
      >
        {q &&
          rows.map((row) => (
            <Link
              key={row.href}
              href={row.href}
              className="grid gap-2 p-4 hover:bg-orange-50 sm:grid-cols-[minmax(0,1fr)_auto]"
            >
              <div className="min-w-0 break-words">
                <p className="font-bold">
                  {row.id} · {row.title}
                </p>
                <p className="mt-1 text-sm text-stone-600">
                  {row.requester} · {row.unit}
                </p>
                <p className="mt-1 text-sm">{row.status}</p>
              </div>
              <p className="font-semibold tabular-nums">{money(row.amount)} บาท</p>
            </Link>
          ))}
        {(!q || !rows.length) && (
          <p className="p-8 text-center text-stone-600">
            {q
              ? "ไม่พบคำขอที่ตรงกับคำค้นและสิทธิ์ของคุณ ลองใช้คำค้นอื่น"
              : "กรอกเลขคำขอ ชื่อเรื่อง หรือชื่อผู้ยื่นเพื่อเริ่มค้นหา"}
          </p>
        )}
      </section>
    </AppShell>
  );
}
