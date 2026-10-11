import Link from "next/link";
import { AppShell } from "../components/app-shell";
import { PageHeader } from "../components/ui";
import { getRequests } from "../lib/live-data";
import { getPayments } from "../payments/data";
import { getWorkTasks } from "../lib/task-data";
import { paymentHref } from "../payments/payment-model";
import { TasksClient } from "../tasks/tasks-client";

export default async function ActivityPage() {
  const [tasks, requests, payments] = await Promise.all([
    getWorkTasks(),
    getRequests(),
    getPayments(),
  ]);
  const followups = [
    ...requests.rows
      .filter((row) => ["draft", "returned"].includes(row.rawStatus))
      .map((row) => ({
        href: `/requests/${encodeURIComponent(row.id)}`,
        id: row.id,
        title: row.title,
        status: row.rawStatus,
      })),
    ...payments.rows
      .filter((row) => ["draft", "returned"].includes(row.status))
      .map((row) => ({
        href: paymentHref(row.paymentNo),
        id: row.paymentNo,
        title: row.subject,
        status: row.status,
      })),
  ];
  return (
    <AppShell>
      <PageHeader
        title="รายการที่ต้องติดตาม"
        description="งานรอคุณพิจารณา และฉบับร่างหรือคำขอที่ถูกส่งกลับซึ่งคุณมีสิทธิ์ดู · ไม่ใช่การแจ้งเตือนทางอีเมล/LINE"
      />
      {[tasks.error, requests.error, payments.error].filter(Boolean).map((error, i) => (
        <p key={i} role="alert" className="mt-4 border p-4 text-[var(--red)]">
          {error}
        </p>
      ))}
      <TasksClient tasks={tasks.rows} />
      <section className="mt-5 border border-[var(--line-dark)] bg-[var(--paper)]">
        <h2 className="border-b p-4 text-lg font-bold">ฉบับร่างและรายการส่งกลับแก้ไข</h2>
        <div className="divide-y">
          {followups.map((row) => (
            <Link
              key={row.href}
              href={row.href}
              className="block break-words p-4 hover:bg-orange-50"
            >
              <strong>
                {row.id} · {row.status === "draft" ? "ฉบับร่าง" : "ส่งกลับแก้ไข"}
              </strong>
              <p className="mt-1 text-sm">{row.title}</p>
            </Link>
          ))}
        </div>
        {!followups.length && (
          <p className="p-6 text-stone-600">ไม่มีรายการที่ต้องติดตามในขณะนี้</p>
        )}
      </section>
    </AppShell>
  );
}
