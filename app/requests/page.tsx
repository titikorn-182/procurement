import Link from "next/link";
import { FilePlus2 } from "../components/icons";
import { AppShell } from "../components/app-shell";
import { PageHeader } from "../components/ui";
import { getRequests } from "../lib/live-data";
import { RequestsClient } from "./requests-client";

export default async function RequestsPage() {
  const { rows, error } = await getRequests();
  return <AppShell><PageHeader title="คำขอของฉัน" description="ค้นหา ติดตาม และส่งออกคำขอที่คุณมีสิทธิ์เข้าถึง" action={<Link href="/requests/new" className="inline-flex min-h-10 items-center justify-center gap-2 border border-[var(--orange-dark)] bg-[var(--orange)] px-4 font-semibold text-white hover:bg-[var(--orange-dark)]"><FilePlus2 size={18}/>สร้างคำขอใหม่</Link>}/>{error ? <div role="alert" className="mt-5 border border-red-300 bg-[var(--red-soft)] p-4 text-[var(--red)]"><strong>อ่านข้อมูลคำขอไม่สำเร็จ</strong><p className="mt-1 text-sm">{error}</p></div> : <RequestsClient requests={rows}/>}</AppShell>;
}
