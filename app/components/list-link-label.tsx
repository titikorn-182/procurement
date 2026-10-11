"use client";
import { useLinkStatus } from "next/link";

export function ListLinkLabel({ children }: { children: React.ReactNode }) {
  const { pending } = useLinkStatus();
  return <span aria-live="polite">{pending ? "กำลังโหลด…" : children}</span>;
}
