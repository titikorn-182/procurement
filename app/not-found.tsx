import Link from "next/link";
import { AppShell } from "./components/app-shell";
import { PageHeader } from "./components/ui";
export default function NotFound() {
  return (
    <AppShell>
      <PageHeader
        title="ไม่พบหน้าหรือคำขอที่ต้องการ"
        description="ลิงก์อาจไม่ถูกต้อง หรือบัญชีนี้ไม่มีสิทธิ์เข้าถึงข้อมูล"
      />
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          className="inline-flex min-h-11 items-center border bg-white px-4 font-semibold"
          href="/search"
        >
          ค้นหาคำขอ
        </Link>
        <Link
          className="inline-flex min-h-11 items-center border bg-white px-4 font-semibold"
          href="/"
        >
          กลับ Dashboard
        </Link>
      </div>
    </AppShell>
  );
}
