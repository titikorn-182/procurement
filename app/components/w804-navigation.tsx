"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ChevronDown, FilePlus2 } from "./icons";
import { W804_DOCUMENTS, documentKind } from "../requests/w804/config";

export function W804Navigation({ active }: { active: boolean }) {
  const searchParams = useSearchParams();
  const selected = documentKind(searchParams.get("document"));
  return (
    <details
      key={String(active)}
      open={active}
      className="group border border-white/25 bg-white/[.045]"
    >
      <summary
        className={`flex min-h-13 cursor-pointer list-none items-center gap-3 px-4 py-3 font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] [&::-webkit-details-marker]:hidden ${active ? "bg-[var(--orange)] text-white" : "text-slate-100 hover:bg-white/10"}`}
      >
        <FilePlus2 size={20} className="shrink-0" aria-hidden="true" />
        <span className="min-w-0 flex-1 leading-6">
          คำขอซื้อ ว804<span className="block text-sm">ไม่เกิน 50,000 บาท</span>
        </span>
        <ChevronDown
          size={16}
          className="shrink-0 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <ul aria-label="เมนูคำขอซื้อ ว804" className="border-t border-white/20">
        {W804_DOCUMENTS.map(({ id, label }) => (
          <li key={id}>
            <Link
              href={`/requests/w804?document=${id}`}
              aria-current={active && selected === id ? "page" : undefined}
              className={`block min-h-11 border-b border-white/15 px-5 py-3 text-sm leading-6 last:border-b-0 ${active && selected === id ? "bg-white text-[var(--ink)] font-bold" : "text-slate-100 hover:bg-white/10"}`}
            >
              {label}
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}
