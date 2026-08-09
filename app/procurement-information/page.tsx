import { ExternalLink } from "lucide-react";
import { AppShell } from "../components/app-shell";
import { PROCUREMENT_REPORT_URL, ProcurementReport } from "../components/procurement-report";
import { PageHeader } from "../components/ui";

export default function ProcurementInformationPage() {
  return (
    <AppShell>
      <PageHeader
        title="สารสนเทศการบริหารงานพัสดุ"
        description="รายงานภาพรวมและข้อมูลสนับสนุนการบริหารงานพัสดุจาก Google Looker Studio"
        action={
          <a
            href={PROCUREMENT_REPORT_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center justify-center gap-2 border border-[var(--line-dark)] bg-white px-4 font-semibold text-[var(--ink)] hover:bg-stone-100"
          >
            เปิดรายงานในแท็บใหม่
            <ExternalLink size={17} aria-hidden="true" />
          </a>
        }
      />

      <section className="mt-6 border border-[var(--line-dark)] bg-[var(--paper)]" aria-label="รายงานสารสนเทศการบริหารงานพัสดุ"><ProcurementReport className="h-[calc(100vh-15rem)] min-h-[620px]" /></section>
    </AppShell>
  );
}
