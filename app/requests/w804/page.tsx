import { AppShell } from "@/app/components/app-shell";
import { PageHeader } from "@/app/components/ui";
import { sarabunPsk } from "@/app/components/print/fonts";
import { canPrepareProcurementDocuments } from "@/features/auth/server/queries";
import { documentKind } from "./config";
import { W804Workspace } from "./workspace";

export default async function W804Page({
  searchParams,
}: {
  searchParams: Promise<{ document?: string | string[] }>;
}) {
  const allowed = await canPrepareProcurementDocuments();
  const date = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const fiscalYear = String(date.getFullYear() + 543 + (date.getMonth() >= 9 ? 1 : 0));
  return (
    <AppShell>
      {allowed ? (
        <W804Workspace
          kind={documentKind((await searchParams).document)}
          fiscalYear={fiscalYear}
          fontClassName={sarabunPsk.className}
        />
      ) : (
        <>
          <PageHeader title="คำขอซื้อ ว804 ไม่เกิน 50,000 บาท" />
          <p role="alert" className="mt-6 border border-[var(--line)] bg-white p-5">
            หน้านี้สำหรับผู้ยื่นคำขอและผู้ดูแลระบบที่เปิดใช้งานอยู่
            กรุณาตรวจสอบการเข้าสู่ระบบหรือติดต่อผู้ดูแลระบบ
          </p>
        </>
      )}
    </AppShell>
  );
}
