import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { PageHeader } from "../components/ui";
import { getRequests, getCurrentProfile } from "../lib/live-data";
import { ProcessBoard } from "./process-board";

export default async function ProcessPage() {
  const [{ rows, error }, profile] = await Promise.all([getRequests(), getCurrentProfile()]);
  return (
    <AppShell>
      <PageHeader
        title="ภาพรวมกระบวนการ"
        description="ติดตามคำขอหลักการที่เข้าถึงได้ ไม่เกิน 1,000 รายการล่าสุด · งานเบิกจ่ายอยู่ในเมนู POL-02"
        action={
          profile && ["user", "admin"].includes(profile.role) ? (
            <Link
              href="/requests/new"
              className="inline-flex min-h-10 items-center border border-[var(--orange-dark)] bg-[var(--orange)] px-4 font-semibold text-white"
            >
              สร้างคำขอ
            </Link>
          ) : undefined
        }
      />
      {error ? (
        <div
          role="alert"
          className="mt-5 border border-red-300 bg-[var(--red-soft)] p-4 text-[var(--red)]"
        >
          {error}
        </div>
      ) : (
        <ProcessBoard requests={rows} />
      )}
    </AppShell>
  );
}
