import { AppShell } from "../components/app-shell";
import { PageHeader } from "../components/ui";
import { getMyTasks } from "../lib/live-data";
import { TasksClient } from "./tasks-client";

export default async function TasksPage() {
  const { rows, error } = await getMyTasks();
  return <AppShell><PageHeader title="งานรอตรวจสอบ" description="เปิดงานตามสิทธิ์ของคุณและติดตามรายการที่เกินกำหนด"/>{error ? <div role="alert" className="mt-5 border border-red-300 bg-[var(--red-soft)] p-4 text-[var(--red)]">{error}</div> : <TasksClient tasks={rows}/>}</AppShell>;
}
