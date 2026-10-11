import { createClient } from "@/lib/supabase/server";
import { toSafeActionError } from "@/lib/server/action-errors";
import { dateText, record, text } from "../payments/payment-model";
import type { RequestStatus } from "../requests/status.types";

export type WorkTask = {
  uuid: string;
  id: string;
  href: string;
  title: string;
  requester: string;
  unit: string;
  amount: number;
  date: string;
  due: string;
  dueAt: string | null;
  status: RequestStatus;
  step: string;
  type: string;
};
export function taskAssignedTo(
  task: { assignee_id: string | null; required_role: string },
  userId: string,
  role: string,
) {
  return (
    role === "admin" ||
    task.assignee_id === userId ||
    (!task.assignee_id && task.required_role === role)
  );
}

export async function getWorkTasks() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { rows: [] as WorkTask[], error: "กรุณาเข้าสู่ระบบใหม่" };
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role,active")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile?.active)
    return {
      rows: [] as WorkTask[],
      error: "ไม่สามารถตรวจสอบสิทธิ์ผู้ใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
    };
  const queries = [
    supabase
      .from("workflow_tasks")
      .select(
        "id,step_name,due_at,created_at,assignee_id,required_role,procurement_requests!inner(id,request_no,title,estimated_amount,departments(name_th),profiles!procurement_requests_requester_id_fkey(full_name))",
      )
      .eq("status", "pending")
      .order("due_at", { ascending: true })
      .limit(1000),
    supabase
      .from("payment_workflow_tasks")
      .select(
        "id,step_name,due_at,created_at,assignee_id,required_role,payment_requests!inner(id,payment_no,total_amount,form_data)",
      )
      .eq("status", "pending")
      .order("due_at", { ascending: true })
      .limit(1000),
  ];
  if (profile.role !== "admin")
    for (const query of queries)
      query.or(
        `assignee_id.eq.${user.id},and(assignee_id.is.null,required_role.eq.${profile.role})`,
      );
  const results = await Promise.all(queries);
  const rows: WorkTask[] = results
    .flatMap((result, index) =>
      (result.data ?? []).map((raw) => {
        const task = record(raw),
          request = record(task[index ? "payment_requests" : "procurement_requests"]),
          form = record(request.form_data);
        const id = text(request[index ? "payment_no" : "request_no"]),
          dueAt = text(task.due_at) || null;
        return {
          uuid: text(request.id),
          id,
          href: `/${index ? "payments" : "requests"}/${encodeURIComponent(id)}`,
          title: index ? text(form.subject) : text(request.title),
          requester: index ? text(form.requesterName) : text(record(request.profiles).full_name),
          unit: index ? text(form.departmentName) : text(record(request.departments).name_th),
          amount: Number(request[index ? "total_amount" : "estimated_amount"]),
          date: dateText(text(task.created_at)),
          due: dateText(dueAt),
          dueAt,
          status: (dueAt && new Date(dueAt) < new Date()
            ? "เกินกำหนด"
            : "รอตรวจสอบ") as RequestStatus,
          step: text(task.step_name),
          type: index ? "เบิกจ่าย" : "หลักการ",
        };
      }),
    )
    .sort((a, b) => (a.dueAt ?? "9999").localeCompare(b.dueAt ?? "9999"));
  const error = results.find((result) => result.error)?.error;
  return {
    rows,
    error: error
      ? toSafeActionError("get-work-tasks", error, "โหลดงานรอตรวจสอบไม่ครบ กรุณาลองใหม่")
      : null,
  };
}
