import { createClient } from "@/lib/supabase/server";
import { toSafeActionError } from "@/lib/server/action-errors";
import type { ReturnedRequestEditData, ReturnedRequestVendor } from "../requests/[id]/edit/types";
import { readPol01Checklist } from "../requests/pol01-checklist-schema";
import { normalizePol01ApprovalDetails } from "../requests/pol01";
import type { RequestStatus } from "./mock-data";

const statusMap: Record<string, RequestStatus> = {
  draft: "ร่าง",
  submitted: "รอตรวจสอบ",
  under_review: "รอตรวจสอบ",
  returned: "รอเห็นชอบ",
  not_approved: "รอเห็นชอบ",
  approved: "รอเห็นชอบ",
  budget_control: "คุมยอด",
  sourcing: "รอเห็นชอบ",
  ordered: "รอเห็นชอบ",
  completed: "เสร็จสิ้น",
  cancelled: "เสร็จสิ้น",
};

function formatDate(value: string | null) {
  return value
    ? new Intl.DateTimeFormat("th-TH", { dateStyle: "medium" }).format(new Date(value))
    : "—";
}

export async function getRequests() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("procurement_requests")
    .select(
      "id, request_no, kind, title, estimated_amount, status, current_step, created_at, required_date, departments(name_th), profiles!procurement_requests_requester_id_fkey(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) {
    return {
      rows: [],
      error: toSafeActionError("get-requests", error, "ไม่สามารถโหลดรายการคำขอได้"),
    };
  }
  const rows = (data ?? []).map((raw) => {
    const row = raw as unknown as Record<string, unknown>;
    const department = row.departments as { name_th?: string } | null;
    const profile = row.profiles as { full_name?: string } | null;
    return {
      uuid: String(row.id),
      id: String(row.request_no),
      title: String(row.title),
      requester: profile?.full_name || "—",
      unit: department?.name_th || "—",
      amount: Number(row.estimated_amount),
      date: formatDate(String(row.created_at)),
      due: formatDate(row.required_date ? String(row.required_date) : null),
      status: statusMap[String(row.status)] ?? "รอตรวจสอบ",
      step: `ขั้นตอนที่ ${Number(row.current_step)}`,
      type: row.kind === "hire" ? "จ้าง" : "ซื้อ",
    };
  });
  return { rows, error: null };
}

export async function getCurrentProfile() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  const { data } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .maybeSingle();
  return data as { full_name: string; role: string } | null;
}

export async function getMyTasks() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("workflow_tasks")
    .select(
      "id, step_name, due_at, created_at, procurement_requests!inner(id, request_no, title, estimated_amount, status, departments(name_th), profiles!procurement_requests_requester_id_fkey(full_name))",
    )
    .eq("status", "pending")
    .order("due_at", { ascending: true })
    .limit(50);
  if (error) {
    return {
      rows: [],
      error: toSafeActionError("get-my-tasks", error, "ไม่สามารถโหลดงานรอตรวจสอบได้"),
    };
  }
  const rows = (data ?? []).map((raw) => {
    const task = raw as unknown as Record<string, unknown>;
    const request = task.procurement_requests as Record<string, unknown>;
    const department = request.departments as { name_th?: string } | null;
    const profile = request.profiles as { full_name?: string } | null;
    const due = task.due_at ? new Date(String(task.due_at)) : null;
    return {
      uuid: String(request.id),
      id: String(request.request_no),
      title: String(request.title),
      requester: profile?.full_name || "—",
      unit: department?.name_th || "—",
      amount: Number(request.estimated_amount),
      date: formatDate(String(task.created_at)),
      due: formatDate(due?.toISOString() ?? null),
      status:
        due && due < new Date()
          ? ("เกินกำหนด" as RequestStatus)
          : (statusMap[String(request.status)] ?? ("รอตรวจสอบ" as RequestStatus)),
      step: String(task.step_name),
      type: "ซื้อ",
    };
  });
  return { rows, error: null };
}

export async function getRequestDetail(requestNo: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("procurement_requests")
    .select(
      "id, request_no, requester_id, kind, title, rationale, required_date, budget_year, fund_source, plan_name, expense_category, form_data, estimated_amount, status, current_step, created_at, departments(name_th), profiles!procurement_requests_requester_id_fkey(full_name, position_title), request_items(line_no, description, quantity, unit, unit_price, total_amount), request_attachments(id, file_name, size_bytes, mime_type, created_at), workflow_actions(id, action, comment, created_at, profiles!workflow_actions_actor_id_fkey(full_name))",
    )
    .eq("request_no", requestNo)
    .order("created_at", { referencedTable: "request_attachments", ascending: true })
    .order("id", { referencedTable: "request_attachments", ascending: true })
    .maybeSingle();
  return {
    data: data as unknown as Record<string, unknown> | null,
    error: error
      ? toSafeActionError("get-request-detail", error, "ไม่สามารถโหลดรายละเอียดคำขอได้")
      : null,
  };
}

export async function canCurrentUserEditReturnedRequest(
  requesterId: string,
  status: unknown,
): Promise<boolean> {
  if (status !== "returned") return false;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id === requesterId;
}

function editRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

export async function getReturnedRequestForEdit(requestNo: string): Promise<{
  data: ReturnedRequestEditData | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: null, error: "กรุณาเข้าสู่ระบบใหม่" };

  const { data, error } = await supabase
    .from("procurement_requests")
    .select(
      "id, request_no, requester_id, kind, title, rationale, required_date, budget_year, fund_source, plan_name, expense_category, form_data, status, current_step, request_items(line_no, description, quantity, unit, unit_price, market_price, price_source), request_attachments(id, file_name, size_bytes), workflow_actions(action, comment, created_at)",
    )
    .eq("request_no", requestNo)
    .eq("requester_id", user.id)
    .eq("status", "returned")
    .maybeSingle();

  if (error) {
    return {
      data: null,
      error: toSafeActionError(
        "get-returned-request-for-edit",
        error,
        "ไม่สามารถโหลดคำขอเพื่อแก้ไขได้",
      ),
    };
  }
  if (!data) return { data: null, error: "ไม่พบคำขอที่แก้ไขได้หรือคำขอไม่ได้ถูกส่งกลับ" };

  const formData = editRecord(data.form_data);
  if (formData.formType !== "standard" && formData.formType !== "w119") {
    return { data: null, error: "แบบคำขอนี้ยังไม่รองรับการแก้ไขจากหน้านี้" };
  }
  const budgetCodes = editRecord(formData.budgetCodes);
  const vendorRecord = editRecord(formData.vendor);
  const vendor: ReturnedRequestVendor =
    vendorRecord.type === "registered" && typeof vendorRecord.id === "string"
      ? {
          kind: "registered",
          vendorId: vendorRecord.id,
          vendorName:
            typeof vendorRecord.name === "string" ? vendorRecord.name : "ผู้ประกอบการเดิม",
        }
      : vendorRecord.type === "new" && typeof vendorRecord.name === "string"
        ? { kind: "new", vendorName: vendorRecord.name }
        : { kind: "none" };
  const advanceFundingOption =
    formData.advanceFundingOption === "borrow_before_purchase" ||
    formData.advanceFundingOption === "faculty_direct_pay_credit_vendor"
      ? formData.advanceFundingOption
      : "reimburse_after_purchase";
  const sortedItems = [...(data.request_items ?? [])].sort(
    (left, right) => Number(left.line_no) - Number(right.line_no),
  );
  const items = sortedItems.map((item) => ({
    description: String(item.description),
    quantity: Number(item.quantity),
    unit: String(item.unit),
    unitPrice: Number(item.unit_price),
  }));
  const actions = [...(data.workflow_actions ?? [])].sort(
    (left, right) => Date.parse(String(right.created_at)) - Date.parse(String(left.created_at)),
  );
  const latestReturn = actions.find((action) => action.action === "return");

  const common = {
    id: String(data.id),
    requestNo: String(data.request_no),
    currentStep: Number(data.current_step),
    kind: data.kind === "hire" ? ("hire" as const) : ("purchase" as const),
    title: String(data.title),
    rationale: String(data.rationale),
    requiredDate: String(data.required_date ?? ""),
    budgetYear: Number(data.budget_year),
    fundSource: String(data.fund_source),
    planName: String(data.plan_name ?? ""),
    expenseCategory: String(data.expense_category ?? ""),
    attachments: (data.request_attachments ?? []).map((attachment) => ({
      id: String(attachment.id),
      fileName: String(attachment.file_name),
      sizeBytes: Number(attachment.size_bytes ?? 0),
    })),
    returnReason:
      typeof latestReturn?.comment === "string" && latestReturn.comment.trim()
        ? latestReturn.comment
        : "เจ้าหน้าที่ส่งคำขอกลับเพื่อแก้ไข",
  };

  if (formData.formType === "w119") {
    return {
      data: {
        ...common,
        formType: "w119",
        formData: {
          regulation: String(formData.regulation ?? ""),
          documentNo: String(formData.documentNo ?? ""),
          memoDate: String(formData.memoDate ?? ""),
          departmentName: String(formData.departmentName ?? ""),
          phone: String(formData.phone ?? ""),
          addressee: String(formData.addressee ?? ""),
          selectionCriteria:
            formData.selectionCriteria === "เกณฑ์ราคาประกอบเกณฑ์อื่น"
              ? "เกณฑ์ราคาประกอบเกณฑ์อื่น"
              : "เกณฑ์ราคา",
          advanceRequired: formData.advanceRequired === true,
          budgetCodes: {
            sourceCode: String(budgetCodes.sourceCode ?? ""),
            departmentCode: String(budgetCodes.departmentCode ?? ""),
            fundCode: String(budgetCodes.fundCode ?? ""),
            planCode: String(budgetCodes.planCode ?? ""),
            subprojectCode: String(budgetCodes.subprojectCode ?? ""),
            activityCode: String(budgetCodes.activityCode ?? ""),
          },
        },
        items: sortedItems.map((item, index) => ({
          ...items[index],
          marketPrice: item.market_price == null ? null : Number(item.market_price),
          priceSource: String(item.price_source ?? ""),
        })),
      },
      error: null,
    };
  }

  return {
    data: {
      ...common,
      formType: "standard",
      advanceFundingOption,
      vendor,
      sourceCode: String(budgetCodes.sourceCode ?? "2"),
      departmentCode: String(budgetCodes.departmentCode ?? ""),
      fundCode: String(budgetCodes.fundCode ?? ""),
      activityCode: String(budgetCodes.activityCode ?? ""),
      approvalDetails: normalizePol01ApprovalDetails(formData.approvalDetails),
      documentChecklist: readPol01Checklist(formData.documentChecklist, {
        newVendor: vendor.kind === "new",
        borrowing: advanceFundingOption === "borrow_before_purchase",
      }),
      items,
    },
    error: null,
  };
}

export type RequestDecisionContext = {
  canAct: boolean;
  taskName: string | null;
  requiredRole: string | null;
  dueAt: string | null;
};

export async function getRequestDecisionContext(
  requestId: string,
  currentStep: number,
): Promise<RequestDecisionContext> {
  const emptyContext: RequestDecisionContext = {
    canAct: false,
    taskName: null,
    requiredRole: null,
    dueAt: null,
  };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return emptyContext;

  const [{ data: profile }, { data: task }] = await Promise.all([
    supabase.from("profiles").select("role, active").eq("id", user.id).maybeSingle(),
    supabase
      .from("workflow_tasks")
      .select("step_name, required_role, assignee_id, due_at")
      .eq("request_id", requestId)
      .eq("step_no", currentStep)
      .eq("status", "pending")
      .maybeSingle(),
  ]);

  if (!task) return emptyContext;
  const role = typeof profile?.role === "string" ? profile.role : "";
  const assigneeId = typeof task.assignee_id === "string" ? task.assignee_id : null;
  const requiredRole = typeof task.required_role === "string" ? task.required_role : null;
  const canAct = Boolean(
    profile?.active &&
    (role === "admin" || assigneeId === user.id || (!assigneeId && requiredRole === role)),
  );

  return {
    canAct,
    taskName: typeof task.step_name === "string" ? task.step_name : null,
    requiredRole,
    dueAt: typeof task.due_at === "string" ? task.due_at : null,
  };
}
