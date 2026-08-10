import { createClient } from "@/lib/supabase/server";
import type { RequestStatus } from "./mock-data";

const statusMap: Record<string, RequestStatus> = {
  draft: "ร่าง", submitted: "รอตรวจสอบ", under_review: "รอตรวจสอบ",
  returned: "รอเห็นชอบ", not_approved: "รอเห็นชอบ", approved: "รอเห็นชอบ",
  budget_control: "คุมยอด", sourcing: "รอเห็นชอบ", ordered: "รอเห็นชอบ",
  completed: "เสร็จสิ้น", cancelled: "เสร็จสิ้น",
};

function formatDate(value: string | null) {
  return value ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(value)) : "—";
}

export async function getRequests() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("procurement_requests").select(
    "id, request_no, kind, title, estimated_amount, status, current_step, created_at, required_date, departments(name_th), profiles!procurement_requests_requester_id_fkey(full_name)",
  ).order("created_at", { ascending: false }).limit(50);
  if (error) return { rows: [], error: error.message };
  const rows = (data ?? []).map((raw) => {
    const row = raw as unknown as Record<string, unknown>;
    const department = row.departments as { name_th?: string } | null;
    const profile = row.profiles as { full_name?: string } | null;
    return { uuid: String(row.id), id: String(row.request_no), title: String(row.title), requester: profile?.full_name || "—", unit: department?.name_th || "—", amount: Number(row.estimated_amount), date: formatDate(String(row.created_at)), due: formatDate(row.required_date ? String(row.required_date) : null), status: statusMap[String(row.status)] ?? "รอตรวจสอบ", step: `ขั้นตอนที่ ${Number(row.current_step)}`, type: row.kind === "hire" ? "จ้าง" : "ซื้อ" };
  });
  return { rows, error: null };
}

export async function getCurrentProfile() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase.from("profiles").select("full_name, role").eq("id", user.id).maybeSingle();
  return data as { full_name: string; role: string } | null;
}

export async function getMyTasks() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("workflow_tasks").select(
    "id, step_name, due_at, created_at, procurement_requests!inner(id, request_no, title, estimated_amount, status, departments(name_th), profiles!procurement_requests_requester_id_fkey(full_name))",
  ).eq("status", "pending").order("due_at", { ascending: true }).limit(50);
  if (error) return { rows: [], error: error.message };
  const rows = (data ?? []).map((raw) => {
    const task = raw as unknown as Record<string, unknown>;
    const request = task.procurement_requests as Record<string, unknown>;
    const department = request.departments as { name_th?: string } | null;
    const profile = request.profiles as { full_name?: string } | null;
    const due = task.due_at ? new Date(String(task.due_at)) : null;
    return { uuid: String(request.id), id: String(request.request_no), title: String(request.title), requester: profile?.full_name || "—", unit: department?.name_th || "—", amount: Number(request.estimated_amount), date: formatDate(String(task.created_at)), due: formatDate(due?.toISOString() ?? null), status: due && due < new Date() ? "เกินกำหนด" as RequestStatus : statusMap[String(request.status)] ?? "รอตรวจสอบ" as RequestStatus, step: String(task.step_name), type: "ซื้อ" };
  });
  return { rows, error: null };
}

export async function getRequestDetail(requestNo: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("procurement_requests").select(
    "id, request_no, kind, title, rationale, required_date, budget_year, fund_source, plan_name, expense_category, form_data, estimated_amount, status, current_step, created_at, departments(name_th), profiles!procurement_requests_requester_id_fkey(full_name, position_title), request_items(line_no, description, quantity, unit, unit_price, total_amount), request_attachments(id, file_name, size_bytes), workflow_actions(id, action, comment, created_at, profiles!workflow_actions_actor_id_fkey(full_name))",
  ).eq("request_no", requestNo).maybeSingle();
  return { data: data as unknown as Record<string, unknown> | null, error: error?.message ?? null };
}
