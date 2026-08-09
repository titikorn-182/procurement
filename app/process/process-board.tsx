"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";
import type { RequestRow } from "../requests/requests-client";

const columns = [
  { title: "ตรวจสอบ", test: (step: number) => step <= 2 },
  { title: "เห็นชอบ", test: (step: number) => step >= 3 && step <= 5 },
  { title: "คุมยอด", test: (step: number) => step === 6 },
  { title: "อนุมัติและจัดหา", test: (step: number) => step >= 7 && step < 12 },
  { title: "เสร็จสิ้น", test: (step: number) => step >= 12 },
];
export function ProcessBoard({ requests }: { requests: RequestRow[] }) {
  const [kind,setKind] = useState("all"); const [query,setQuery] = useState("");
  const filtered = useMemo(() => requests.filter((r) => (kind === "all" || r.type === kind) && `${r.id} ${r.title} ${r.unit}`.toLowerCase().includes(query.toLowerCase())), [requests,kind,query]);
  return <><div className="mt-5 flex flex-wrap gap-3 border border-[var(--line-dark)] bg-[var(--paper)] p-3"><select value={kind} onChange={(e)=>setKind(e.target.value)} className="min-h-11 border border-[var(--line)] bg-white px-3 text-base"><option value="all">ทุกประเภทคำขอ</option><option value="ซื้อ">จัดซื้อ</option><option value="จ้าง">จัดจ้าง</option></select><label className="relative min-w-64 flex-1 md:max-w-md"><span className="sr-only">ค้นหากระบวนการ</span><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-500"/><input value={query} onChange={(e)=>setQuery(e.target.value)} className="min-h-11 w-full border border-[var(--line)] pl-9 pr-3 text-base" placeholder="ค้นหาเลขคำขอ เรื่อง หรือหน่วยงาน"/></label><span className="ml-auto self-center text-sm font-semibold">{filtered.length} รายการ</span></div><section className="mt-4 overflow-x-auto border border-[var(--line-dark)] bg-[var(--paper)]"><div className="grid min-w-[1100px] grid-cols-5 divide-x divide-[var(--line)]">{columns.map((column) => { const rows = filtered.filter((r) => column.test(Number(r.step.replace(/\D/g,"")))); return <div key={column.title} className="min-h-[560px]"><div className="flex items-center gap-2 border-b border-[var(--line-dark)] bg-stone-100 p-3"><FileText size={18}/><h2 className="font-bold">{column.title}</h2><span className="ml-auto border border-[var(--line)] bg-white px-2 py-0.5 text-xs font-bold">{rows.length}</span></div><div className="space-y-3 p-3">{rows.length ? rows.map((r) => <Link href={`/requests/${r.id}`} key={r.id} className="block border border-[var(--line-dark)] bg-white p-3 hover:border-[var(--orange)] hover:bg-orange-50"><div className="flex justify-between gap-2"><strong>{r.id}</strong><span className="text-xs">{r.type}</span></div><h3 className="mt-2 line-clamp-2 font-semibold">{r.title}</h3><div className="mt-3 flex justify-between text-xs text-stone-600"><span className="truncate">{r.unit}</span><span>{r.amount.toLocaleString("th-TH")} บ.</span></div></Link>) : <p className="border border-dashed border-[var(--line)] p-4 text-center text-sm text-stone-500">ไม่มีรายการ</p>}</div></div>; })}</div></section></>;
}
