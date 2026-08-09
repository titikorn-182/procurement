import Link from "next/link";
import { ArrowRight, FileText } from "lucide-react";
import { AppShell } from "../../components/app-shell";
import { PageHeader } from "../../components/ui";

export default function NewRequestPage() {
  return (
    <AppShell>
      <PageHeader
        title="เลือกแบบคำขอซื้อ/จ้าง"
        description="เลือกแบบฟอร์มให้ตรงกับวิธีดำเนินการ ระบบจะแยกข้อมูลและเอกสารตามประเภทคำขอ"
      />
      <section className="mt-6 max-w-3xl border border-[var(--line-dark)] bg-[var(--paper)]">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
          <div className="flex size-14 shrink-0 items-center justify-center bg-[var(--orange-soft)] text-[var(--orange-dark)]">
            <FileText size={27} aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-[var(--ink)]">แบบฟอร์มขอซื้อขอจ้าง ว119</h2>
            <p className="mt-2 max-w-2xl leading-7 text-stone-600">สำหรับจัดทำบันทึกข้อความ รายการพัสดุ ราคากลาง รหัสงบประมาณ ผู้ตรวจรับ และเอกสารประกอบ ตามหนังสือ ด่วนที่สุด ที่ กค (กวจ) 0405.2/ว119 ลงวันที่ 7 มีนาคม 2561</p>
            <Link href="/requests/w119" className="mt-5 inline-flex min-h-11 items-center gap-2 border border-[var(--orange-dark)] bg-[var(--orange)] px-4 font-bold text-white transition-colors hover:bg-[var(--orange-dark)]">เปิดแบบฟอร์ม ว119 <ArrowRight size={17} /></Link>
          </div>
        </div>
      </section>
    </AppShell>
  );
}
