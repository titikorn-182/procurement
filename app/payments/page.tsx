import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { PageHeader } from "../components/ui";
import { getPayments } from "./data";
import { PaymentsClient } from "./payments-client";
import { getCurrentProfile } from "../lib/live-data";

export default async function PaymentsPage() {
  const [{ rows, error }, profile] = await Promise.all([getPayments(), getCurrentProfile()]);
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
      {error ? (
        <p
          role="alert"
          className="mt-5 border border-red-300 bg-[var(--red-soft)] p-4 text-[var(--red)]"
        >
          {error}
        </p>
      ) : (
        <PaymentsClient rows={rows} />
      )}
    </AppShell>
  );
}
