"use client";
import Link from "next/link";
import { AppShell } from "./components/app-shell";
import { PageHeader, Button } from "./components/ui";
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <AppShell>
      <PageHeader
        title="โหลดหน้านี้ไม่สำเร็จ"
        description="กรุณาตรวจสอบการเชื่อมต่อแล้วลองอีกครั้ง หากยังพบปัญหาให้ติดต่อผู้ดูแลระบบ"
      />
      <p
        role="alert"
        className="mt-5 border border-red-300 bg-[var(--red-soft)] p-4 text-[var(--red)]"
      >
        ไม่สามารถแสดงข้อมูลได้ในขณะนี้ ข้อมูลที่ยังไม่ได้บันทึกอาจต้องกรอกใหม่
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-4">
        <Button onClick={reset}>ลองโหลดอีกครั้ง</Button>
        <Link href="/" className="inline-flex min-h-11 items-center px-3 underline">
          กลับ Dashboard
        </Link>
      </div>
    </AppShell>
  );
}
