import Image from "next/image";
import { redirect } from "next/navigation";
import { ShieldCheck } from "../components/icons";
import { inputClass } from "../components/ui";
import { createClient } from "@/lib/supabase/server";
import { login } from "./actions";

const systemNameLineOne = "ระบบการบริหารจัดการคำขอการจัดซื้อจัดจ้าง";
const systemNameLineTwo = "และสารสนเทศการบริหารงานพัสดุ";

function SystemTitle({ compact = false }: { compact?: boolean }) {
  return <h1 className={compact ? "text-2xl font-bold leading-9" : "text-2xl font-bold leading-[1.22] tracking-[-.025em] text-[var(--ink)] xl:text-4xl 2xl:text-5xl"}>
    <span className={compact ? "block" : "block whitespace-nowrap text-[var(--graphite)]"}>{systemNameLineOne}</span>
    <span className={compact ? "block" : "block whitespace-nowrap text-[var(--orange-dark)]"}>{systemNameLineTwo}</span>
  </h1>;
}

function BrandLockup({ compact = false }: { compact?: boolean }) {
  return <div className={`flex items-center ${compact ? "gap-3" : "gap-4"}`}>
    <div className="flex shrink-0 items-center gap-2" aria-hidden="true">
      <Image src="/ubu-emblem.png" alt="" width={compact ? 48 : 62} height={compact ? 54 : 70} className="h-auto object-contain" priority />
      <span className="h-10 w-px bg-stone-300" />
      <Image src="/political-science-ubu.png" alt="" width={compact ? 54 : 70} height={compact ? 54 : 70} className="h-auto object-contain mix-blend-multiply" priority />
    </div>
    <div className="min-w-0">
      <p className={`${compact ? "text-sm" : "text-base"} font-bold text-[var(--ink)]`}>คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี</p>
      <p className="mt-0.5 text-xs text-stone-600">Faculty of Political Science, Ubon Ratchathani University</p>
    </div>
  </div>;
}

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/");
  const error = typeof params.error === "string" ? params.error : null;
  const next = typeof params.next === "string" ? params.next : "/";

  return <main className="grid min-h-screen bg-[var(--paper-warm)] lg:grid-cols-[minmax(0,1fr)_520px]">
    <section className="relative hidden overflow-hidden border-r border-[var(--line-dark)] p-10 lg:flex lg:flex-col xl:p-14">
      <Image
        src="/political-science-building-clean.png"
        alt=""
        fill
        sizes="(min-width: 1024px) calc(100vw - 520px), 0px"
        className="pointer-events-none object-cover object-center opacity-50"
        priority
      />
      <div className="relative z-10 w-fit drop-shadow-[0_2px_3px_rgba(255,255,255,0.95)]"><BrandLockup /></div>
      <div className="absolute bottom-28 left-10 right-10 z-10 max-w-3xl drop-shadow-[0_2px_4px_rgba(255,255,255,0.95)] xl:left-14 xl:right-14">
        <SystemTitle />
        <p className="mt-7 max-w-2xl text-lg leading-8 text-stone-700">พื้นที่ทำงานกลางสำหรับยื่นคำขอ ตรวจสอบเอกสาร ติดตามลำดับอนุมัติ และบริหารข้อมูลพัสดุอย่างเป็นระบบ</p>
      </div>
      <div className="absolute bottom-10 left-10 z-10 flex w-fit items-center gap-2 text-sm font-semibold text-stone-700 drop-shadow-[0_1px_2px_rgba(255,255,255,0.95)] xl:bottom-14 xl:left-14"><ShieldCheck size={18}/>เชื่อมต่อ Supabase Auth และควบคุมการเข้าถึงด้วยสิทธิ์ตามบทบาท</div>
    </section>

    <section className="flex items-center p-5 sm:p-10">
      <div className="w-full">
        <div className="mb-7 lg:hidden"><BrandLockup compact /><div className="mt-6"><SystemTitle compact /></div></div>
        <div className="border border-[var(--line-dark)] bg-[var(--paper)]">
          <div className="border-b border-[var(--line)] bg-[var(--graphite)] p-6 text-white"><h2 className="text-2xl font-bold">เข้าสู่ระบบ</h2><p className="mt-1 text-sm text-slate-200">ใช้บัญชีบุคลากรที่ผู้ดูแลระบบสร้างไว้</p></div>
          <form action={login} className="p-6 sm:p-8">
            <input type="hidden" name="next" value={next}/>
            {error && <div role="alert" className="mb-5 border border-red-300 bg-[var(--red-soft)] p-3 font-semibold text-[var(--red)]">{error}</div>}
            <label className="block"><span className="mb-1.5 block font-semibold">อีเมล</span><input name="email" type="email" required autoComplete="email" autoFocus className={`${inputClass} text-base`} placeholder="name@ubu.ac.th"/></label>
            <label className="mt-5 block"><span className="mb-1.5 block font-semibold">รหัสผ่าน</span><input name="password" type="password" required minLength={6} autoComplete="current-password" className={`${inputClass} text-base`}/></label>
            <button type="submit" className="mt-6 min-h-11 w-full border border-[var(--orange-dark)] bg-[var(--orange)] px-4 font-bold text-white transition-colors hover:bg-[var(--orange-dark)]">เข้าสู่ระบบงานพัสดุ</button>
            <p className="mt-5 border-t border-[var(--line)] pt-4 text-sm text-stone-600">หากยังไม่มีบัญชีหรือบทบาทไม่ถูกต้อง กรุณาติดต่อผู้ดูแลระบบ</p>
          </form>
          <footer className="border-t border-[var(--line)] bg-stone-50 px-6 py-4 text-center text-xs leading-5 text-stone-600 sm:px-8">
            <span className="block">พัฒนาโดย สำนักงานเลขานุการ คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี</span>
            <span className="block">ฐิติกรณ์รัศมิ์ ภัททสิริภูวดล เจ้าหน้าที่บริหารงานทั่วไปชำนาญการพิเศษ</span>
          </footer>
        </div>
      </div>
    </section>
  </main>;
}
