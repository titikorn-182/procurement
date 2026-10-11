import { connection } from "next/server";
import { AppShell } from "@/app/components/app-shell";
import { PageHeader } from "@/app/components/ui";
import { sarabunPsk } from "@/app/components/print/fonts";
import { createClient } from "@/lib/supabase/server";
import { SECTION79_TITLE } from "./model";
import { Section79Workspace } from "./workspace";

export default async function Section79Page() {
  // Keep request-time access outside the catch; never prerender a caught denial.
  await connection();
  let allowed = false;
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (user && !error) {
      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("role, active")
        .eq("id", user.id)
        .maybeSingle();
      allowed =
        !profileError && profile?.active === true && ["admin", "user"].includes(profile.role);
    }
  } catch {
    allowed = false;
  }
  const date = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Bangkok" }));
  const fiscalYear = String(date.getFullYear() + 543 + (date.getMonth() >= 9 ? 1 : 0));
  return (
    <AppShell>
      {allowed ? (
        <Section79Workspace fiscalYear={fiscalYear} fontClassName={sarabunPsk.className} />
      ) : (
        <>
          <PageHeader title={SECTION79_TITLE} />
          <p role="alert" className="mt-6 border border-[var(--line)] bg-white p-5">
            หน้านี้สำหรับผู้ยื่นคำขอและผู้ดูแลระบบที่เปิดใช้งานอยู่
            กรุณาตรวจสอบการเข้าสู่ระบบหรือติดต่อผู้ดูแลระบบ
          </p>
        </>
      )}
    </AppShell>
  );
}
