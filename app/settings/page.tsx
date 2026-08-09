import { AppShell } from "../components/app-shell";
import { PageHeader } from "../components/ui";
import { createClient } from "@/lib/supabase/server";
import { SettingsWorkspace } from "./settings-workspace";

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle()
    : { data: null };

  if (profile?.role !== "admin") {
    return <AppShell><PageHeader title="ตั้งค่าระบบ" description="พื้นที่สำหรับผู้ดูแลระบบ"/><div role="alert" className="mt-6 border border-amber-300 bg-[var(--amber-soft)] p-5 text-[var(--amber)]"><h2 className="font-bold">ไม่มีสิทธิ์แก้ไขการตั้งค่า</h2><p className="mt-1 text-sm">บัญชีนี้ต้องมีบทบาทผู้ดูแลระบบ (admin) กรุณาติดต่อผู้ดูแลระบบหลัก</p></div></AppShell>;
  }

  const [{ data: profiles }, { data: departments }, { data: settings, error: settingsError }] = await Promise.all([
    supabase.from("profiles").select("id, full_name, role, department_id, active").order("full_name"),
    supabase.from("departments").select("id, code, name_th, active").order("code"),
    supabase.from("system_settings").select("key, value, updated_at"),
  ]);

  return <AppShell><PageHeader title="ตั้งค่าระบบ" description="จัดการสิทธิ์ ข้อมูลหลัก และนโยบายการทำงานจากจุดเดียว"/><SettingsWorkspace profiles={profiles ?? []} departments={departments ?? []} settings={settings ?? []} databaseReady={!settingsError}/></AppShell>;
}
