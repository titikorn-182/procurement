import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Clock3, FileClock } from "./icons";
import type { RequestStatus } from "../lib/mock-data";

export function Button({ children, variant = "primary", className = "", type = "button", disabled = false, onClick }: { children: ReactNode; variant?: "primary" | "secondary" | "danger" | "ghost"; className?: string; type?: "button" | "submit"; disabled?: boolean; onClick?: () => void }) {
  const styles = {
    primary: "border-[var(--orange-dark)] bg-[var(--orange)] text-white hover:bg-[var(--orange-dark)]",
    secondary: "border-[var(--line-dark)] bg-white text-[var(--ink)] hover:bg-[var(--paper-warm)]",
    danger: "border-[var(--red)] bg-white text-[var(--red)] hover:bg-[var(--red-soft)]",
    ghost: "border-transparent bg-transparent text-[var(--ink)] hover:bg-black/5",
  }[variant];
  return <button type={type} disabled={disabled} onClick={onClick} className={`inline-flex min-h-10 items-center justify-center gap-2 border px-4 font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${styles} ${className}`}>{children}</button>;
}

export function StatusBadge({ status }: { status: RequestStatus }) {
  const config = {
    "รอตรวจสอบ": ["bg-[var(--blue-soft)] text-[var(--blue)] border-blue-200", FileClock],
    "รอเห็นชอบ": ["bg-[var(--amber-soft)] text-[var(--amber)] border-amber-200", Clock3],
    "คุมยอด": ["bg-violet-50 text-violet-800 border-violet-200", Clock3],
    "เกินกำหนด": ["bg-[var(--red-soft)] text-[var(--red)] border-red-200", AlertTriangle],
    "เสร็จสิ้น": ["bg-[var(--green-soft)] text-[var(--green)] border-green-200", CheckCircle2],
    "ร่าง": ["bg-stone-100 text-stone-700 border-stone-300", FileClock],
  }[status] as [string, typeof Clock3];
  const Icon = config[1];
  return <span className={`inline-flex items-center gap-1.5 border px-2 py-1 text-xs font-semibold ${config[0]}`}><Icon size={14} aria-hidden="true" />{status}</span>;
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="flex flex-col gap-4 border-b border-[var(--line)] pb-5 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-[clamp(1.55rem,3vw,2rem)] font-bold tracking-[-.02em] text-[var(--ink)]">{title}</h1>{description && <p className="mt-1 max-w-3xl text-sm text-stone-600">{description}</p>}</div>{action}</div>;
}

export function Field({ label, required, hint, children }: { label: string; required?: boolean; hint?: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1.5 block text-sm font-semibold">{label}{required && <span className="ml-1 text-[var(--red)]" aria-hidden="true">*</span>}</span>{children}{hint && <span className="mt-1 block text-xs text-stone-500">{hint}</span>}</label>;
}

export const inputClass = "min-h-11 w-full border border-[var(--line-dark)] bg-white px-3 text-[var(--ink)] placeholder:text-stone-500 hover:border-stone-900";
