"use client";

import { useMemo, useState, useTransition } from "react";
import { Bell, Building2, CheckCircle2, FileText, Save, Settings, ShieldCheck, SlidersHorizontal, UsersRound, WalletCards } from "lucide-react";
import { Button } from "../components/ui";
import { createDepartment, saveSystemSetting, updateUserRole } from "./actions";

type Profile = { id: string; full_name: string; role: string; department_id: string | null; active: boolean };
type Department = { id: string; code: string; name_th: string; active: boolean };
type Setting = { key: string; value: Record<string, unknown>; updated_at: string };
type SectionKey = "users" | "departments" | "workflow" | "budget" | "documents" | "notifications" | "sla" | "integrations";

const sections = [
  { key: "users", title: "ผู้ใช้และสิทธิ์", detail: "กำหนดบทบาทและหน่วยงาน", icon: UsersRound },
  { key: "departments", title: "หน่วยงานและตำแหน่ง", detail: "จัดการโครงสร้างหน่วยงาน", icon: Building2 },
  { key: "workflow", title: "Workflow และอำนาจอนุมัติ", detail: "วงเงินและผู้เห็นชอบ", icon: ShieldCheck },
  { key: "budget", title: "งบประมาณ", detail: "ปีงบประมาณและแหล่งเงิน", icon: WalletCards },
  { key: "documents", title: "เลขเอกสารและเทมเพลต", detail: "รูปแบบเลขที่เอกสาร", icon: FileText },
  { key: "notifications", title: "การแจ้งเตือน", detail: "ช่องทางแจ้งสถานะและงานใหม่", icon: Bell },
  { key: "sla", title: "SLA และวันทำการ", detail: "ระยะเวลาดำเนินงาน", icon: SlidersHorizontal },
  { key: "integrations", title: "Integration", detail: "สถานะระบบเชื่อมต่อ", icon: Settings },
] as const;

const roleLabels: Record<string, string> = { user: "ผู้ยื่นคำขอ", procurement_staff: "เจ้าหน้าที่พัสดุ", finance_staff: "เจ้าหน้าที่การเงิน", head_procurement: "หัวหน้าเจ้าหน้าที่พัสดุ", deputy_secretary: "รองหัวหน้าสำนักงาน", deputy_finance: "รองคณบดีฝ่ายการเงินและพัสดุ", dean: "คณบดี", head_office: "หัวหน้าสำนักงานเลขานุการ", admin: "ผู้ดูแลระบบ" };
const inputClass = "min-h-11 w-full border border-[var(--line-dark)] bg-white px-3 text-base text-[var(--ink)]";

export function SettingsWorkspace({ profiles, departments, settings, databaseReady }: { profiles: Profile[]; departments: Department[]; settings: Setting[]; databaseReady: boolean }) {
  const [section, setSection] = useState<SectionKey>("users");
  const [notice, setNotice] = useState<{ tone: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const settingsMap = useMemo(() => Object.fromEntries(settings.map((item) => [item.key, item.value])), [settings]);

  function run(action: () => Promise<{ error: string | null }>) {
    setNotice(null);
    startTransition(async () => {
      const result = await action();
      setNotice(result.error ? { tone: "error", text: result.error } : { tone: "success", text: "บันทึกการตั้งค่าแล้ว" });
    });
  }

  return <div className="mt-6 grid gap-5 xl:grid-cols-[290px_minmax(0,1fr)]">
    <nav aria-label="หมวดการตั้งค่าระบบ" className="border border-[var(--line-dark)] bg-[var(--paper)]">
      <div className="border-b border-[var(--line)] p-4"><h2 className="font-bold">หมวดการตั้งค่า</h2><p className="mt-1 text-xs text-stone-500">เลือกหัวข้อเพื่อแก้ไขรายละเอียด</p></div>
      <div className="divide-y divide-[var(--line)]">{sections.map(({ key, title, detail, icon: Icon }) => <button key={key} type="button" aria-current={section === key ? "page" : undefined} onClick={() => { setSection(key); setNotice(null); }} className={`flex min-h-16 w-full items-center gap-3 px-4 py-3 text-left transition-colors ${section === key ? "bg-[var(--orange)] text-white" : "hover:bg-orange-50"}`}><Icon size={19} aria-hidden="true"/><span className="min-w-0"><span className="block font-semibold">{title}</span><span className={`block truncate text-xs ${section === key ? "text-orange-50" : "text-stone-500"}`}>{detail}</span></span></button>)}</div>
    </nav>

    <section className="min-w-0 border border-[var(--line-dark)] bg-[var(--paper)]">
      <header className="border-b border-[var(--line)] p-5"><h2 className="text-xl font-bold">{sections.find((item) => item.key === section)?.title}</h2><p className="mt-1 text-sm text-stone-600">{sections.find((item) => item.key === section)?.detail}</p></header>
      {!databaseReady && section !== "users" && section !== "departments" && <div role="alert" className="m-5 border border-amber-300 bg-[var(--amber-soft)] p-4 text-sm text-[var(--amber)]">ยังไม่พบตาราง system_settings กรุณารัน migration ล่าสุดก่อนบันทึกหมวดนี้</div>}
      {notice && <div role={notice.tone === "error" ? "alert" : "status"} className={`m-5 flex items-center gap-2 border p-3 ${notice.tone === "error" ? "border-red-300 bg-[var(--red-soft)] text-[var(--red)]" : "border-green-300 bg-[var(--green-soft)] text-[var(--green)]"}`}><CheckCircle2 size={18}/>{notice.text}</div>}
      <div className="p-5">
        {section === "users" && <UsersPanel profiles={profiles} departments={departments} pending={pending} run={run}/>} 
        {section === "departments" && <DepartmentsPanel departments={departments} pending={pending} run={run}/>} 
        {!["users", "departments"].includes(section) && <GenericPanel section={section} initial={settingsMap[section] ?? {}} disabled={!databaseReady || pending} onSave={(value) => run(() => saveSystemSetting(section, value))}/>} 
      </div>
    </section>
  </div>;
}

function UsersPanel({ profiles, departments, pending, run }: { profiles: Profile[]; departments: Department[]; pending: boolean; run: (action: () => Promise<{ error: string | null }>) => void }) {
  if (!profiles.length) return <p className="text-sm text-stone-600">ยังไม่มีผู้ใช้ในระบบ</p>;
  return <div className="overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-left"><thead className="bg-stone-100"><tr><th className="border border-[var(--line)] p-3">ผู้ใช้</th><th className="border border-[var(--line)] p-3">บทบาท</th><th className="border border-[var(--line)] p-3">หน่วยงาน</th><th className="border border-[var(--line)] p-3">การทำงาน</th></tr></thead><tbody>{profiles.map((profile) => <UserRow key={profile.id} profile={profile} departments={departments} pending={pending} run={run}/>)}</tbody></table></div>;
}

function UserRow({ profile, departments, pending, run }: { profile: Profile; departments: Department[]; pending: boolean; run: (action: () => Promise<{ error: string | null }>) => void }) {
  const [role, setRole] = useState(profile.role); const [departmentId, setDepartmentId] = useState(profile.department_id ?? "");
  return <tr><td className="border border-[var(--line)] p-3"><strong>{profile.full_name || "ไม่ระบุชื่อ"}</strong><span className="mt-1 block text-xs text-stone-500">{profile.active ? "ใช้งานอยู่" : "ระงับการใช้งาน"}</span></td><td className="border border-[var(--line)] p-2"><select aria-label={`บทบาทของ ${profile.full_name}`} className={inputClass} value={role} onChange={(event) => setRole(event.target.value)}>{Object.entries(roleLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></td><td className="border border-[var(--line)] p-2"><select aria-label={`หน่วยงานของ ${profile.full_name}`} className={inputClass} value={departmentId} onChange={(event) => setDepartmentId(event.target.value)}><option value="">ยังไม่กำหนด</option>{departments.map((department) => <option key={department.id} value={department.id}>{department.code} — {department.name_th}</option>)}</select></td><td className="border border-[var(--line)] p-2"><Button disabled={pending || (role === profile.role && departmentId === (profile.department_id ?? ""))} onClick={() => run(() => updateUserRole(profile.id, role, departmentId))}><Save size={16}/>บันทึก</Button></td></tr>;
}

function DepartmentsPanel({ departments, pending, run }: { departments: Department[]; pending: boolean; run: (action: () => Promise<{ error: string | null }>) => void }) {
  const [code, setCode] = useState(""); const [name, setName] = useState("");
  return <div className="space-y-5"><form onSubmit={(event) => { event.preventDefault(); run(() => createDepartment(code, name)); }} className="grid gap-3 border border-[var(--line)] bg-stone-50 p-4 md:grid-cols-[160px_minmax(0,1fr)_auto]"><label><span className="mb-1 block text-sm font-semibold">รหัสหน่วยงาน</span><input required maxLength={20} className={inputClass} value={code} onChange={(event) => setCode(event.target.value)}/></label><label><span className="mb-1 block text-sm font-semibold">ชื่อหน่วยงาน</span><input required maxLength={200} className={inputClass} value={name} onChange={(event) => setName(event.target.value)}/></label><Button type="submit" disabled={pending} className="self-end">เพิ่มหน่วยงาน</Button></form><div className="divide-y divide-[var(--line)] border border-[var(--line)]">{departments.length ? departments.map((department) => <div key={department.id} className="flex items-center gap-4 p-3"><strong className="w-24">{department.code}</strong><span className="flex-1">{department.name_th}</span><span className={`border px-2 py-1 text-xs font-semibold ${department.active ? "border-green-200 bg-green-50 text-green-800" : "border-stone-300 text-stone-500"}`}>{department.active ? "ใช้งาน" : "ปิดใช้งาน"}</span></div>) : <p className="p-4 text-sm text-stone-600">ยังไม่มีหน่วยงาน</p>}</div></div>;
}

function GenericPanel({ section, initial, disabled, onSave }: { section: SectionKey; initial: Record<string, unknown>; disabled: boolean; onSave: (value: Record<string, unknown>) => void }) {
  const [value, setValue] = useState(initial);
  const configs: Record<string, Array<{ key: string; label: string; type: "text" | "number" | "boolean"; fallback: string | number | boolean }>> = {
    workflow: [{ key: "approval_limit", label: "วงเงินที่ต้องผ่านหัวหน้าเจ้าหน้าที่พัสดุ (บาท)", type: "number", fallback: 500000 }, { key: "require_head_procurement", label: "บังคับผ่านหัวหน้าเจ้าหน้าที่พัสดุ", type: "boolean", fallback: true }],
    budget: [{ key: "fiscal_year", label: "ปีงบประมาณปัจจุบัน", type: "number", fallback: 2569 }, { key: "default_fund", label: "แหล่งเงินเริ่มต้น", type: "text", fallback: "เงินงบประมาณแผ่นดิน" }],
    documents: [{ key: "purchase_prefix", label: "คำนำหน้าเลขคำขอซื้อ/จ้าง", type: "text", fallback: "PR" }, { key: "payment_prefix", label: "คำนำหน้าเลขคำขอเบิกจ่าย", type: "text", fallback: "PV" }],
    notifications: [{ key: "in_app", label: "แจ้งเตือนภายในระบบ", type: "boolean", fallback: true }, { key: "email", label: "แจ้งเตือนทางอีเมล", type: "boolean", fallback: true }, { key: "line", label: "แจ้งเตือนทาง LINE", type: "boolean", fallback: false }],
    sla: [{ key: "review_days", label: "ระยะเวลาตรวจสอบ (วันทำการ)", type: "number", fallback: 2 }, { key: "approval_days", label: "ระยะเวลาอนุมัติ (วันทำการ)", type: "number", fallback: 3 }, { key: "business_days_only", label: "นับเฉพาะวันทำการ", type: "boolean", fallback: true }],
    integrations: [{ key: "sso", label: "สถานะระบบ SSO", type: "text", fallback: "pending" }, { key: "budget", label: "สถานะระบบงบประมาณ", type: "text", fallback: "pending" }, { key: "digital_signature", label: "สถานะลายเซ็นดิจิทัล", type: "text", fallback: "pending" }],
  };
  const fields = configs[section] ?? [];
  return <form onSubmit={(event) => { event.preventDefault(); onSave(value); }} className="max-w-2xl space-y-5">{fields.map((field) => field.type === "boolean" ? <label key={field.key} className="flex min-h-12 items-center justify-between gap-4 border border-[var(--line)] p-3"><span className="font-semibold">{field.label}</span><input type="checkbox" className="size-5 accent-[var(--orange)]" checked={Boolean(value[field.key] ?? field.fallback)} onChange={(event) => setValue((current) => ({ ...current, [field.key]: event.target.checked }))}/></label> : <label key={field.key} className="block"><span className="mb-1.5 block font-semibold">{field.label}</span><input required type={field.type} min={field.type === "number" ? 0 : undefined} className={inputClass} value={String(value[field.key] ?? field.fallback)} onChange={(event) => setValue((current) => ({ ...current, [field.key]: field.type === "number" ? Number(event.target.value) : event.target.value }))}/></label>)}<Button type="submit" disabled={disabled}><Save size={17}/>{disabled ? "ยังบันทึกไม่ได้" : "บันทึกการตั้งค่า"}</Button></form>;
}
