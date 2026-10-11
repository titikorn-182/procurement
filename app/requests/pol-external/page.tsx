import { AppShell } from "@/app/components/app-shell";
import { PageHeader } from "@/app/components/ui";
import { sarabunPsk } from "@/app/components/print/fonts";
import { canPrepareProcurementDocuments } from "@/features/auth/server/queries";
import { ExternalForm } from "./form";

export default async function ExternalPage() {
  const allowed = await canPrepareProcurementDocuments();
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  return (
    <AppShell>
      {allowed ? (
        <ExternalForm today={today} fontClassName={sarabunPsk.className} />
      ) : (
        <>
          <PageHeader title="คำขอหลักการ POL- ภายนอก" />
          <p role="alert" className="mt-5 border border-[var(--line)] bg-white p-5">
            หน้านี้สำหรับผู้ยื่นคำขอและผู้ดูแลระบบที่เปิดใช้งานอยู่ กรุณาตรวจสอบการเข้าสู่ระบบ
          </p>
        </>
      )}
    </AppShell>
  );
}
