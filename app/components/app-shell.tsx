"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Bell, ChevronDown, ClipboardCheck, FilePlus2, FileText, FolderKanban, Gauge, LayoutDashboard, Menu, ReceiptText, Search, Settings, UserRound, WalletCards, X } from "./icons";
import { createClient } from "@/lib/supabase/client";
import { logout } from "../login/actions";

const nav = [
  { href: "/", label: "แผงควบคุม", icon: LayoutDashboard, roles: ["ผู้ดูแลระบบ","ผู้ยื่นคำขอ","เจ้าหน้าที่พัสดุ","ผู้บริหาร"] },
  { href: "/requests", label: "คำขอของฉัน", icon: FileText, roles: ["ผู้ดูแลระบบ","ผู้ยื่นคำขอ"] },
  { href: "/payments/new", label: "คำขอเบิกจ่าย", icon: ReceiptText, roles: ["ผู้ดูแลระบบ","ผู้ยื่นคำขอ"] },
  { href: "/tasks", label: "งานรอตรวจสอบ", icon: ClipboardCheck, badge: 5, roles: ["ผู้ดูแลระบบ","เจ้าหน้าที่พัสดุ"] },
  { href: "/process", label: "ภาพรวมกระบวนการ", icon: FolderKanban, roles: ["ผู้ดูแลระบบ","เจ้าหน้าที่พัสดุ","ผู้บริหาร"] },
  { href: "/reports", label: "รายงาน", icon: Gauge, roles: ["ผู้ดูแลระบบ","เจ้าหน้าที่พัสดุ","ผู้บริหาร"] },
  { href: "/settings", label: "ตั้งค่าระบบ", icon: Settings, roles: ["ผู้ดูแลระบบ"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const [contextRole,setContextRole] = useState("ผู้ดูแลระบบ");
  const [profileName,setProfileName] = useState("กำลังโหลดข้อมูล...");
  useEffect(() => { const media = window.matchMedia("(min-width: 1024px)"); const update = () => setDesktop(media.matches); update(); media.addEventListener("change", update); return () => media.removeEventListener("change", update); }, []);
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) return;
      const { data: profile } = await supabase.from("profiles").select("full_name, role").eq("id", data.user.id).maybeSingle();
      const role = profile?.role as string | undefined;
      const executiveRoles = ["head_procurement","deputy_secretary","deputy_finance","dean","head_office"];
      setContextRole(role === "admin" ? "ผู้ดูแลระบบ" : role === "user" ? "ผู้ยื่นคำขอ" : executiveRoles.includes(role ?? "") ? "ผู้บริหาร" : "เจ้าหน้าที่พัสดุ");
      setProfileName(profile?.full_name || data.user.email || "ผู้ใช้งาน");
    });
  }, []);
  useEffect(() => { const close = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); }; document.addEventListener("keydown", close); return () => document.removeEventListener("keydown", close); }, []);
  useEffect(() => {
    if (!open || desktop) return;
    const drawer = drawerRef.current;
    const opener = menuButtonRef.current;
    const focusable = drawer?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])');
    focusable?.[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !focusable?.length) return;
      const first = focusable[0]; const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    drawer?.addEventListener("keydown", trap);
    return () => { drawer?.removeEventListener("keydown", trap); opener?.focus(); };
  }, [open, desktop]);
  return <div className="min-h-screen bg-[var(--paper-warm)]">
    <button ref={menuButtonRef} onClick={() => setOpen(true)} className="fixed left-3 top-3 z-40 border border-stone-400 bg-white p-2.5 shadow-sm lg:hidden" aria-label="เปิดเมนู" aria-expanded={open} aria-controls="main-navigation"><Menu size={20} /></button>
    {open && <button className="fixed inset-0 z-40 bg-black/45 lg:hidden" onClick={() => setOpen(false)} aria-label="ปิดเมนู" />}
    <aside ref={drawerRef} id="main-navigation" aria-hidden={!desktop && !open} inert={!desktop && !open} className={`fixed inset-y-0 left-0 z-50 flex w-[252px] flex-col bg-[var(--graphite)] text-white transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex min-h-16 items-center justify-between border-b border-white/25 px-4"><Link href="/" className="flex items-center gap-3 font-bold" onClick={() => setOpen(false)}><span className="flex h-9 w-9 items-center justify-center border border-white/55 bg-white/5"><FilePlus2 size={20} /></span><span>ระบบจัดซื้อจัดจ้าง</span></Link><button className="p-2 lg:hidden" onClick={() => setOpen(false)} aria-label="ปิดเมนู"><X size={20}/></button></div>
      <nav className="scrollbar-thin flex-1 space-y-2 overflow-y-auto p-3" aria-label="เมนูหลัก">{nav.filter(item=>item.roles.includes(contextRole)).map(({ href, label, icon: Icon, badge }) => { const active = href === "/" ? path === "/" : path.startsWith(href); return <Link key={href} href={href} onClick={() => setOpen(false)} className={`fasteners flex min-h-13 items-center gap-3 border px-4 transition-colors ${active ? "border-[#a93205] bg-[var(--orange)] text-white" : "border-white/25 bg-white/[.045] text-slate-100 hover:bg-white/10"}`}><Icon size={20} aria-hidden="true"/><span className="flex-1 font-semibold">{label}</span>{badge && <span className="min-w-6 bg-white px-1.5 text-center text-xs font-bold text-[var(--orange-dark)]">{badge}</span>}</Link>; })}</nav>
      <div className="p-3"><div className="hazard fasteners flex items-center gap-3 border border-[#9f3208] p-3 text-[var(--ink)]"><AlertTriangle size={22}/><div><div className="font-bold">งานเกินกำหนด</div><div className="text-xs">3 รายการต้องติดตาม</div></div></div></div>
      <div className="border-t border-white/20 p-3"><div className="mb-2 text-xs text-slate-300">บัญชีที่เข้าสู่ระบบ</div><div className="flex items-center gap-2 border border-white/20 bg-white/[.04] p-2"><span className="flex h-9 w-9 items-center justify-center bg-white text-[var(--graphite)]"><UserRound size={19}/></span><div className="min-w-0 flex-1"><div className="truncate text-sm font-semibold">{profileName}</div><div className="text-xs text-slate-300">{contextRole}</div></div></div><form action={logout}><button type="submit" className="mt-2 min-h-10 w-full border border-white/30 px-3 text-sm font-semibold hover:bg-white/10">ออกจากระบบ</button></form></div>
    </aside>
    <div className="lg:pl-[252px]">
      <header className="sticky top-0 z-30 flex min-h-16 items-center border-b border-[var(--line-dark)] bg-[var(--paper)] px-4 pl-16 lg:px-6"><div className="hidden text-sm font-semibold text-stone-600 md:block">ต้นแบบ UI · ข้อมูลจำลอง</div><div className="ml-auto flex items-center gap-2"><label className="relative hidden md:block"><span className="sr-only">ค้นหา</span><Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500"/><input className="h-10 w-72 border border-[var(--line)] bg-white pl-9 pr-3" placeholder="ค้นหาเลขคำขอ ชื่อเรื่อง ผู้ยื่น"/></label><button className="relative border border-[var(--line)] bg-white p-2.5 hover:bg-stone-100" aria-label="การแจ้งเตือน 5 รายการ"><Bell size={19}/><span className="absolute -right-1 -top-1 min-w-5 bg-[var(--orange)] px-1 text-center text-xs font-bold text-white">5</span></button><button className="hidden min-h-10 items-center gap-2 border border-[var(--line)] bg-white px-3 sm:flex" aria-label={`บทบาทปัจจุบัน ${contextRole}`}><WalletCards size={18}/><span>{contextRole}</span><ChevronDown size={15}/></button></div></header>
      <main className="min-h-[calc(100vh-4rem)] p-4 sm:p-6 xl:p-8">{children}</main>
    </div>
  </div>;
}
