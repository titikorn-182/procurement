import { AppShell } from "@/app/components/app-shell";
import { PageHeader } from "@/app/components/ui";
import { sarabunPsk } from "@/app/components/print/fonts";
import { createClient } from "@/lib/supabase/server";
import { ExternalForm } from "./form";

export default async function ExternalPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  const { data: profile, error: profileError } =
    user && !error
      ? await supabase.from("profiles").select("role, active").eq("id", user.id).maybeSingle()
      : { data: null, error: null };
  const allowed =
    !error && !profileError && profile?.active === true && ["admin", "user"].includes(profile.role);
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
