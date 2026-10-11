import { connection } from "next/server";
import { AppShell } from "../components/app-shell";
import { PageHeader } from "../components/ui";
import { getCatalogAccess } from "./actions";
import { CatalogWorkspace } from "./catalog-workspace";

export default async function CatalogPage() {
  // Resolve authorization only for a real request, outside the access error boundary.
  await connection();
  const access = await getCatalogAccess();
  return (
    <AppShell>
      {access.canRead ? (
        <CatalogWorkspace canManage={access.canManage} />
      ) : (
        <>
          <PageHeader
            title="Procurement Data Catalog"
            description="ฐานข้อมูลพัสดุและราคาอ้างอิงของคณะรัฐศาสตร์"
          />
          <p
            role="alert"
            className="mt-6 border border-red-300 bg-[var(--red-soft)] p-5 text-[var(--red)]"
          >
            {access.error || "บัญชีนี้ไม่มีสิทธิ์อ่านแค็ตตาล็อก กรุณาติดต่อผู้ดูแลระบบ"}
          </p>
        </>
      )}
    </AppShell>
  );
}
