import { AppShell } from "../components/app-shell";
import { PageHeader } from "../components/ui";
import { getRequests } from "../lib/live-data";
import { ReportsDashboard } from "./reports-dashboard";

export default async function ReportsPage() {
  const { rows, error } = await getRequests();
  return <AppShell><PageHeader title="รายงานและการวิเคราะห์" description="สรุปข้อมูลคำขอที่บัญชีของคุณมีสิทธิ์เข้าถึง"/>{error ? <div role="alert" className="mt-5 border border-red-300 bg-[var(--red-soft)] p-4 text-[var(--red)]">{error}</div> : <ReportsDashboard requests={rows}/>}</AppShell>;
}
