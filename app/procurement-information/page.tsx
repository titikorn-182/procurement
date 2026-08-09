import { ExternalLink } from "lucide-react";
import { AppShell } from "../components/app-shell";
import { PageHeader } from "../components/ui";

const reportUrl = "https://datastudio.google.com/reporting/8d47754d-944c-4730-a95b-21c7960e84f4/page/AEt2F";
const embedUrl = "https://lookerstudio.google.com/embed/reporting/8d47754d-944c-4730-a95b-21c7960e84f4/page/AEt2F";

export default function ProcurementInformationPage() {
  return (
    <AppShell>
      <PageHeader
        title="สารสนเทศการบริหารงานพัสดุ"
        description="รายงานภาพรวมและข้อมูลสนับสนุนการบริหารงานพัสดุจาก Google Looker Studio"
        action={
          <a
            href={reportUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-10 items-center justify-center gap-2 border border-[var(--line-dark)] bg-white px-4 font-semibold text-[var(--ink)] hover:bg-stone-100"
          >
            เปิดรายงานในแท็บใหม่
            <ExternalLink size={17} aria-hidden="true" />
          </a>
        }
      />

      <section className="mt-6 border border-[var(--line-dark)] bg-[var(--paper)]" aria-label="รายงานสารสนเทศการบริหารงานพัสดุ">
        <div className="border-b border-[var(--line)] bg-stone-100 px-4 py-3 text-sm text-stone-700">
          หากรายงานไม่แสดง กรุณาใช้ปุ่ม “เปิดรายงานในแท็บใหม่” และเข้าสู่ระบบ Google ด้วยบัญชีที่มีสิทธิ์ดูรายงาน
        </div>
        <iframe
          src={embedUrl}
          title="รายงานสารสนเทศการบริหารงานพัสดุ"
          className="block h-[calc(100vh-15rem)] min-h-[620px] w-full bg-white"
          loading="eager"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </section>
    </AppShell>
  );
}
