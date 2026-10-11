import Link from "next/link";
import { AppShell } from "./components/app-shell";
import { ChevronRight, Gauge } from "./components/icons";
import { PageHeader } from "./components/ui";
import { ProcurementReport } from "./components/procurement-report";
import { getCurrentProfile, getRequests } from "./lib/live-data";
import { getWorkTasks } from "./lib/task-data";
import { getPayments } from "./payments/data";
import { TasksClient } from "./tasks/tasks-client";

export default async function Home() {
  const [requests, payments, tasks, profile] = await Promise.all([
    getRequests(),
    getPayments(),
    getWorkTasks(),
    getCurrentProfile(),
  ]);
  const overdue = tasks.rows.filter((task) => task.status === "เกินกำหนด").length;
  const groups = Array.from(new Set(tasks.rows.map((task) => task.step))).map((name) => ({
    name,
    count: tasks.rows.filter((task) => task.step === name).length,
  }));
  const errors = [requests.error, payments.error, tasks.error].filter(Boolean);
  return (
    <AppShell>
      <PageHeader
        title={`สวัสดี ${profile?.full_name || "ผู้ใช้งาน"}`}
        description="ภาพรวมจากคำขอและงานที่บัญชีนี้มีสิทธิ์เข้าถึง"
        action={
          <Link
            href="/procurement-information"
            className="inline-flex min-h-10 items-center justify-center gap-2 border border-[var(--orange-dark)] bg-[var(--orange)] px-4 font-semibold text-white hover:bg-[var(--orange-dark)]"
          >
            <Gauge size={18} />
            สารสนเทศการบริหารงานพัสดุ
          </Link>
        }
      />
      {errors.map((error, index) => (
        <p
          key={index}
          role="alert"
          className="mt-5 border border-red-300 bg-[var(--red-soft)] p-4 text-[var(--red)]"
        >
          {error}
        </p>
      ))}
      <section
        className="mt-6 border border-[var(--line-dark)] bg-[var(--paper)]"
        aria-labelledby="procurement-information-heading"
      >
        <div className="flex flex-col gap-2 border-b border-[var(--line)] px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 id="procurement-information-heading" className="text-lg font-bold">
              สารสนเทศการบริหารงานพัสดุ
            </h2>
            <p className="text-xs text-stone-500">
              รายงานภาพรวมและข้อมูลสนับสนุนการบริหารงานพัสดุจาก Google Looker Studio
            </p>
          </div>
          <Link
            href="/procurement-information"
            className="inline-flex min-h-10 shrink-0 items-center gap-1 self-start px-2 font-semibold text-[var(--orange-dark)] hover:underline sm:self-auto"
          >
            เปิดมุมมองเต็มหน้า <ChevronRight size={16} />
          </Link>
        </div>
        <ProcurementReport className="h-[clamp(560px,70vh,860px)]" />
      </section>
      <section
        className="mt-6 border border-[var(--line-dark)] bg-[var(--paper)]"
        aria-labelledby="workflow-heading"
      >
        <div className="border-b p-4">
          <h2 id="workflow-heading" className="text-lg font-bold">
            งานรอพิจารณาแยกตามขั้นตอน
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            รวมคำขอหลักการและเบิกจ่ายที่รอคุณดำเนินการ ผู้ดูแลระบบเห็นงานทุกบทบาท
          </p>
        </div>
        <div className="grid divide-y sm:grid-cols-2 xl:grid-cols-3">
          {groups.map((group) => (
            <Link
              key={group.name}
              href="/tasks"
              className="flex items-center justify-between gap-4 p-4 hover:bg-orange-50"
            >
              <span className="font-semibold">{group.name}</span>
              <span className="shrink-0 tabular-nums">{group.count} งาน</span>
            </Link>
          ))}
        </div>
        {!groups.length && (
          <p className="p-6 text-stone-600">
            {tasks.error ? "ไม่สามารถสรุปงานได้ในขณะนี้" : "ไม่มีงานรอคุณพิจารณาในขณะนี้"}
          </p>
        )}
      </section>
      <section
        aria-label="สรุปคำขอ"
        className="mt-5 grid border border-[var(--line-dark)] bg-[var(--paper)] sm:grid-cols-2 xl:grid-cols-4"
      >
        {[
          {
            label: "คำขอหลักการที่เข้าถึงได้",
            value: requests.error ? "—" : requests.rows.length,
            href: "/requests",
          },
          {
            label: "คำขอเบิกจ่ายที่เข้าถึงได้",
            value: payments.error ? "—" : payments.rows.length,
            href: "/payments",
          },
          { label: "งานรอพิจารณา", value: tasks.error ? "—" : tasks.rows.length, href: "/tasks" },
          { label: "งานรอพิจารณาเกินกำหนด", value: tasks.error ? "—" : overdue, href: "/activity" },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="border-[var(--line)] p-5 hover:bg-orange-50 sm:border-r"
          >
            <p className="text-sm text-stone-600">{item.label}</p>
            <p className="mt-1 text-3xl font-bold tabular-nums text-[var(--orange)]">
              {item.value}
            </p>
          </Link>
        ))}
      </section>
      <p className="mt-2 text-xs text-stone-600">
        ข้อมูลคำขอและงานแสดงไม่เกิน 1,000 รายการล่าสุดต่อประเภท ไม่ใช่ยอดรวมบัญชีการเงิน
      </p>
      <h2 className="mt-8 text-xl font-bold">งานที่ต้องดำเนินการ</h2>
      <TasksClient tasks={tasks.rows} />
    </AppShell>
  );
}
