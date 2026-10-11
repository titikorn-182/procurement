"use client";

import Link from "next/link";
import { FilePlus2 } from "./icons";

export function W804Navigation({ active }: { active: boolean }) {
  return (
    <Link
      href="/requests/w804"
      aria-current={active ? "page" : undefined}
      className={`fasteners flex min-h-13 items-center gap-3 border px-4 py-3 font-semibold transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] ${active ? "border-[#a93205] bg-[var(--orange)] text-white" : "border-white/25 bg-white/[.045] text-slate-100 hover:bg-white/10"}`}
    >
      <FilePlus2 size={20} className="shrink-0" aria-hidden="true" />
      <span className="min-w-0 flex-1 whitespace-nowrap leading-6">
        คำขอซื้อ ว804 ไม่เกิน 50,000 บาท
      </span>
    </Link>
  );
}
