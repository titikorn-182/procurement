import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { PageHeader } from "../components/ui";
import { getCurrentProfile, getRequests } from "../lib/live-data";
import { RequestsClient } from "./requests-client";

export default async function RequestsPage() {
  const [{ rows, error }, profile] = await Promise.all([getRequests(), getCurrentProfile()]);
  return (
    <AppShell>
      <PageHeader
        title="คำขอหลักการ POL-01"
        description="ค้นหา ติดตาม และส่งออกรายการที่คุณมีสิทธิ์เข้าถึง · ไม่เกิน 1,000 รายการล่าสุด"
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
      {error ? (
        <p
          role="alert"
          className="mt-5 border border-red-300 bg-[var(--red-soft)] p-4 text-[var(--red)]"
        >
          {error}
        </p>
      ) : (
        <RequestsClient requests={rows} />
      )}
    </AppShell>
  );
}
