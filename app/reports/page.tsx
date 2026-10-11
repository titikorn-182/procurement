import { AppShell } from "../components/app-shell";
import { PageHeader } from "../components/ui";
import { getRequests } from "../lib/live-data";
import { ReportsDashboard } from "./reports-dashboard";

export default async function ReportsPage() {
  const { rows, error } = await getRequests();
  return (
    <AppShell>
      <PageHeader
        title="รายงานและการวิเคราะห์"
        description="สรุปคำขอหลักการที่บัญชีนี้มีสิทธิ์เข้าถึง ไม่เกิน 1,000 รายการล่าสุด · เลือกปีงบประมาณเพื่อกรองรายงาน"
      />
      {error ? (
        <div
          role="alert"
          className="mt-5 border border-red-300 bg-[var(--red-soft)] p-4 text-[var(--red)]"
        >
          {error}
        </div>
      ) : (
        <ReportsDashboard requests={rows} />
      )}
    </AppShell>
  );
}
