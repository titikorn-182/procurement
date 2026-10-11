"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { W804Navigation } from "./w804-navigation";
import { GlobalSearch } from "./global-search";
import {
  AlertTriangle,
  Bell,
  ClipboardCheck,
  FilePlus2,
  FileText,
  FolderKanban,
  Gauge,
  LayoutDashboard,
  PackageCheck,
  Menu,
  ReceiptText,
  Settings,
  UserRound,
  WalletCards,
  X,
} from "./icons";
import { getShellProfile } from "@/features/auth/profile.client";
import { logout } from "../login/actions";

const nav = [
  {
    href: "/",
    label: "Dashboard บริหารงานพัสดุ",
    icon: LayoutDashboard,
    roles: ["ผู้ดูแลระบบ", "ผู้ยื่นคำขอ", "เจ้าหน้าที่", "ผู้บริหาร"],
  },
  {
    href: "/catalog",
    label: "Procurement Data Catalog",
    icon: PackageCheck,
    roles: ["ผู้ดูแลระบบ", "ผู้ยื่นคำขอ", "เจ้าหน้าที่", "ผู้บริหาร"],
  },
  {
    href: "/requests",
    label: "คำขอหลักการ POL-01",
    icon: FileText,
    roles: ["ผู้ดูแลระบบ", "ผู้ยื่นคำขอ", "เจ้าหน้าที่", "ผู้บริหาร"],
  },
  {
    href: "/payments",
    label: "คำขอเบิกจ่าย POL-02",
    icon: ReceiptText,
    roles: ["ผู้ดูแลระบบ", "ผู้ยื่นคำขอ", "เจ้าหน้าที่", "ผู้บริหาร"],
  },
  {
    href: "/requests/w119",
    label: "คำขอซื้อ/จ้าง ว119",
    icon: FilePlus2,
    roles: ["ผู้ดูแลระบบ", "ผู้ยื่นคำขอ"],
  },
  {
    href: "/requests/w804",
    label: "คำขอซื้อ ว804 ไม่เกิน 50,000 บาท",
    icon: FilePlus2,
    roles: ["ผู้ดูแลระบบ", "ผู้ยื่นคำขอ"],
  },
  {
    href: "/requests/section79",
    label: "คำขอซื้อ/จ้าง ข้อ 79 วรรค 2",
    icon: FilePlus2,
    roles: ["ผู้ดูแลระบบ", "ผู้ยื่นคำขอ"],
  },
  {
    href: "/requests/pol-external",
    label: "คำขอหลักการ POL- ภายนอก",
    icon: FilePlus2,
    roles: ["ผู้ดูแลระบบ", "ผู้ยื่นคำขอ"],
  },
  {
    href: "/tasks",
    label: "งานรอตรวจสอบ",
    icon: ClipboardCheck,
    roles: ["ผู้ดูแลระบบ", "เจ้าหน้าที่", "ผู้บริหาร"],
  },
  {
    href: "/process",
    label: "ภาพรวมกระบวนการ",
    icon: FolderKanban,
    roles: ["ผู้ดูแลระบบ", "เจ้าหน้าที่", "ผู้บริหาร"],
  },
  {
    href: "/reports",
    label: "รายงาน",
    icon: Gauge,
    roles: ["ผู้ดูแลระบบ", "เจ้าหน้าที่", "ผู้บริหาร"],
  },
  { href: "/settings", label: "ตั้งค่าระบบ", icon: Settings, roles: ["ผู้ดูแลระบบ"] },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const drawerRef = useRef<HTMLElement>(null);
  const [contextRole, setContextRole] = useState("กำลังตรวจสอบสิทธิ์");
  const [profileName, setProfileName] = useState("กำลังโหลดข้อมูล...");
  useEffect(() => {
    const media = window.matchMedia("(min-width: 1024px)");
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    getShellProfile().then((profile) => {
      if (!profile) return;
      setContextRole(profile.roleLabel);
      setProfileName(profile.name);
    });
  }, []);
  useEffect(() => {
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);
  useEffect(() => {
    if (!open || desktop) return;
    const drawer = drawerRef.current;
    const opener = menuButtonRef.current;
    const focusable = drawer?.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    focusable?.[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== "Tab" || !focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    drawer?.addEventListener("keydown", trap);
    return () => {
      drawer?.removeEventListener("keydown", trap);
      opener?.focus();
    };
  }, [open, desktop]);
  return (
    <div className="min-h-screen bg-[var(--paper-warm)]">
      <button
        ref={menuButtonRef}
        onClick={() => setOpen(true)}
        className="fixed left-3 top-3 z-40 border border-stone-400 bg-white p-2.5 shadow-sm lg:hidden"
        aria-label="เปิดเมนู"
        aria-expanded={open}
        aria-controls="main-navigation"
      >
        <Menu size={20} />
      </button>
      {open && (
        <button
          className="fixed inset-0 z-40 bg-black/45 lg:hidden"
          onClick={() => setOpen(false)}
          aria-label="ปิดเมนู"
        />
      )}
      <aside
        ref={drawerRef}
        id="main-navigation"
        aria-hidden={!desktop && !open}
        inert={!desktop && !open}
        className={`fixed inset-y-0 left-0 z-50 flex w-80 flex-col bg-[var(--graphite)] text-white transition-transform lg:translate-x-0 ${open ? "translate-x-0" : "-translate-x-full"}`}
      >
        <div className="relative border-b border-white/20 px-4 py-4">
          <Link href="/" className="flex flex-col items-start gap-3" onClick={() => setOpen(false)}>
            <span className="flex h-14 w-14 shrink-0 items-center justify-center bg-white p-1.5">
              <Image
                src="/political-science-ubu.png"
                alt="ตราสัญลักษณ์คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี"
                width={48}
                height={48}
                className="h-full w-full object-contain"
                priority
              />
            </span>
            <span className="min-w-0 text-xs font-bold leading-5 tracking-[.01em] text-white">
              <span className="block whitespace-nowrap">
                ระบบการบริหารจัดการคำขอการจัดซื้อจัดจ้าง
              </span>
              <span className="block whitespace-nowrap text-orange-200">
                และสารสนเทศการบริหารงานพัสดุ
              </span>
            </span>
          </Link>
          <button
            className="absolute right-2 top-2 p-2 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="ปิดเมนู"
          >
            <X size={20} />
          </button>
        </div>
        <nav
          className="scrollbar-thin min-h-0 flex-1 space-y-2 overflow-y-auto p-3"
          aria-label="เมนูหลัก"
        >
          {nav
            .filter((item) => item.roles.includes(contextRole))
            .map(({ href, label, icon: Icon }) => {
              if (href === "/requests/w804") {
                return (
                  <div
                    key={href}
                    onClick={(event) => {
                      if ((event.target as HTMLElement).closest("a")) setOpen(false);
                    }}
                  >
                    <W804Navigation active={path === href} />
                  </div>
                );
              }
              const active =
                href === "/"
                  ? path === "/"
                  : href === "/requests"
                    ? path === "/requests"
                    : path.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className={`fasteners flex min-h-13 items-center gap-3 border px-4 transition-colors ${active ? "border-[#a93205] bg-[var(--orange)] text-white" : "border-white/25 bg-white/[.045] text-slate-100 hover:bg-white/10"}`}
                >
                  <Icon size={20} aria-hidden="true" />
                  <span className="flex-1 font-semibold">{label}</span>
                </Link>
              );
            })}
        </nav>
        <div className="shrink-0 p-3">
          <Link
            href="/activity"
            onClick={() => setOpen(false)}
            className="flex items-center gap-3 border border-white/25 p-3 text-white hover:bg-white/10"
          >
            <AlertTriangle size={22} />
            <div>
              <div className="font-bold">รายการที่ต้องติดตาม</div>
              <div className="text-xs">เปิดงานรอพิจารณาและคำขอที่ส่งกลับ</div>
            </div>
          </Link>
        </div>
        <div className="shrink-0 border-t border-white/15 px-4 py-3 text-xs leading-5 text-slate-300">
          <span className="block whitespace-nowrap">พัฒนาโดย สำนักงานเลขานุการ คณะรัฐศาสตร์</span>
          <span className="block whitespace-nowrap">มหาวิทยาลัยอุบลราชธานี</span>
          <span className="block whitespace-nowrap text-slate-400">
            ฐิติกรณ์รัศมิ์ ภัททสิริภูวดล
          </span>
          <span className="block whitespace-nowrap text-slate-400">
            เจ้าหน้าที่บริหารงานทั่วไปชำนาญการพิเศษ
          </span>
        </div>
        <div className="shrink-0 border-t border-white/20 p-3">
          <div className="mb-2 text-xs text-slate-300">บัญชีที่เข้าสู่ระบบ</div>
          <div className="flex items-center gap-2 border border-white/20 bg-white/[.04] p-2">
            <span className="flex h-9 w-9 items-center justify-center bg-white text-[var(--graphite)]">
              <UserRound size={19} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">{profileName}</div>
              <div className="text-xs text-slate-300">{contextRole}</div>
            </div>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="mt-2 min-h-10 w-full border border-white/30 px-3 text-sm font-semibold hover:bg-white/10"
            >
              ออกจากระบบ
            </button>
          </form>
        </div>
      </aside>
      <div className="lg:pl-80">
        <header className="sticky top-0 z-30 flex min-h-16 items-center border-b border-[var(--line-dark)] bg-[var(--paper)] px-4 pl-16 lg:px-6">
          <div className="hidden text-sm font-semibold text-stone-600 md:block">
            ระบบบริหารงานพัสดุ
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden w-80 lg:block">
              <GlobalSearch />
            </div>
            <Link
              href="/search"
              className="inline-flex min-h-11 items-center border border-[var(--line)] px-3 font-semibold lg:hidden"
            >
              ค้นหา
            </Link>
            <Link
              href="/activity"
              className="relative border border-[var(--line)] bg-white p-2.5 hover:bg-stone-100"
              aria-label="เปิดรายการที่ต้องติดตาม"
            >
              <Bell size={19} />
            </Link>
            <span
              className="hidden min-h-10 items-center gap-2 border border-[var(--line)] bg-white px-3 sm:flex"
              aria-label={`บทบาทปัจจุบัน ${contextRole}`}
            >
              <WalletCards size={18} />
              <span>{contextRole}</span>
            </span>
          </div>
        </header>
        <main className="min-h-[calc(100vh-4rem)] min-w-0 p-4 sm:p-6 xl:p-8">{children}</main>
      </div>
    </div>
  );
}
