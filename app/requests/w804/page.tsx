import { AppShell } from "@/app/components/app-shell";
import { PageHeader } from "@/app/components/ui";
import { sarabunPsk } from "@/app/components/print/fonts";
import { canPrepareProcurementDocuments } from "@/features/auth/server/queries";
import { documentKind } from "./config";
import { W804Workspace } from "./workspace";
import { getW804Draft } from "@/features/w804/server/queries";
import Link from "next/link";

export default async function W804Page({
  searchParams,
}: {
  searchParams: Promise<{ document?: string | string[]; request?: string | string[] }>;
}) {
  const allowed = await canPrepareProcurementDocuments();
  const params = await searchParams;
  const requestedNo = Array.isArray(params.request) ? params.request[0] : params.request;
  const saved = allowed && requestedNo ? await getW804Draft(requestedNo) : null;
  const date = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const fiscalYear = String(date.getFullYear() + 543 + (date.getMonth() >= 9 ? 1 : 0));
  return (
    <AppShell>
      {allowed && saved?.error ? (
        <>
          <PageHeader title="เปิดคำขอ ว804 ไม่สำเร็จ" />
          <p role="alert" className="my-5 border border-[var(--line)] bg-white p-5">
            {saved.error}
          </p>
          <Link href="/requests/w804/registry" className="underline">
            กลับไปทะเบียน ว804
          </Link>
        </>
      ) : allowed ? (
        <W804Workspace
          key={saved?.record?.id ?? "new"}
          initial={saved?.record ?? undefined}
          kind={documentKind(params.document)}
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
