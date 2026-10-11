import { AppShell } from "../components/app-shell";
import { PageHeader } from "../components/ui";
import { getSettingsWorkspace } from "@/features/settings/server/queries";
import { SettingsWorkspace } from "./settings-workspace";

export default async function SettingsPage() {
  const workspace = await getSettingsWorkspace();
  if (!workspace.allowed) {
    return (
      <AppShell>
        <PageHeader title="ตั้งค่าระบบ" description="พื้นที่สำหรับผู้ดูแลระบบ" />
        <div
          role="alert"
          className="mt-6 border border-amber-300 bg-[var(--amber-soft)] p-5 text-[var(--amber)]"
        >
          <h2 className="font-bold">ไม่มีสิทธิ์แก้ไขการตั้งค่า</h2>
          <p className="mt-1 text-sm">
            บัญชีนี้ต้องมีบทบาทผู้ดูแลระบบ (admin) และเปิดใช้งานอยู่ กรุณาติดต่อผู้ดูแลระบบหลัก
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        title="ตั้งค่าระบบ"
        description="จัดการสิทธิ์ ข้อมูลหลัก และนโยบายการทำงานจากจุดเดียว"
      />
      <SettingsWorkspace
        profiles={workspace.profiles}
        profilesError={workspace.profilesError}
        departments={workspace.departments}
        settings={workspace.settings}
        databaseReady={workspace.databaseReady}
      />
    </AppShell>
  );
}
