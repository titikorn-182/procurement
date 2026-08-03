import { redirect } from "next/navigation";
import { FileText, ShieldCheck } from "../components/icons";
import { inputClass } from "../components/ui";
import { createClient } from "@/lib/supabase/server";
import { login } from "./actions";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/");
  const error = typeof params.error === "string" ? params.error : null;
  const next = typeof params.next === "string" ? params.next : "/";
  return <main className="grid min-h-screen bg-[var(--paper-warm)] lg:grid-cols-[minmax(0,1fr)_520px]">
    <section className="paper-grid hidden border-r border-[var(--line-dark)] p-10 lg:flex lg:flex-col lg:justify-between"><div className="flex items-center gap-3 text-lg font-bold"><span className="flex h-11 w-11 items-center justify-center border border-[var(--line-dark)] bg-[var(--graphite)] text-white"><FileText/></span>ระบบจัดซื้อจัดจ้าง</div><div className="max-w-2xl"><div className="signal-in inline-flex border border-[var(--orange-dark)] bg-[var(--orange)] px-3 py-1 font-semibold text-white">ศูนย์ควบคุมเอกสาร</div><h1 className="mt-6 text-[clamp(2.4rem,5vw,4.8rem)] font-bold leading-[1.15] tracking-[-.03em]">ทุกคำขอมีเส้นทาง<br/>ทุกการอนุมัติตรวจสอบได้</h1><p className="mt-6 max-w-xl text-lg text-stone-700">เข้าสู่พื้นที่ทำงานตามบทบาทของคุณ เพื่อยื่นคำขอ ตรวจเอกสาร คุมยอด และอนุมัติตามลำดับที่รับผิดชอบ</p></div><div className="flex items-center gap-2 text-sm font-semibold text-stone-600"><ShieldCheck size={18}/>เชื่อมต่อ Supabase Auth · การเข้าถึงควบคุมด้วย RLS</div></section>
    <section className="flex items-center p-6 sm:p-10"><div className="w-full border border-[var(--line-dark)] bg-[var(--paper)]"><div className="border-b border-[var(--line)] bg-[var(--graphite)] p-6 text-white"><h2 className="text-2xl font-bold">เข้าสู่ระบบ</h2><p className="mt-1 text-sm text-slate-200">ใช้บัญชีบุคลากรที่ผู้ดูแลระบบสร้างไว้</p></div><form action={login} className="p-6 sm:p-8"><input type="hidden" name="next" value={next}/>{error&&<div role="alert" className="mb-5 border border-red-300 bg-[var(--red-soft)] p-3 font-semibold text-[var(--red)]">{error}</div>}<label className="block"><span className="mb-1.5 block font-semibold">อีเมล</span><input name="email" type="email" required autoComplete="email" autoFocus className={inputClass} placeholder="name@ubu.ac.th"/></label><label className="mt-5 block"><span className="mb-1.5 block font-semibold">รหัสผ่าน</span><input name="password" type="password" required minLength={6} autoComplete="current-password" className={inputClass}/></label><button type="submit" className="mt-6 min-h-11 w-full border border-[var(--orange-dark)] bg-[var(--orange)] px-4 font-bold text-white hover:bg-[var(--orange-dark)]">เข้าสู่ศูนย์ควบคุมเอกสาร</button><p className="mt-5 border-t border-[var(--line)] pt-4 text-sm text-stone-600">หากยังไม่มีบัญชีหรือบทบาทไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ</p></form></div></section>
  </main>;
}
