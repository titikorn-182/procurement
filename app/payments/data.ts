import { createClient } from "@/lib/supabase/server";
import { toSafeActionError } from "@/lib/server/action-errors";
import { record, text, type PaymentRecord } from "./payment-model";

export type PaymentRow = {
  id: string;
  paymentNo: string;
  subject: string;
  requester: string;
  department: string;
  sourceNo: string;
  amount: number;
  status: string;
  createdAt: string;
  step: number;
};

export async function getPayments() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_requests")
    .select(
      "id, payment_no, total_amount, status, current_step, created_at, form_data, procurement_requests(request_no), profiles!payment_requests_requester_id_fkey(full_name)",
    )
    .order("created_at", { ascending: false })
    .limit(1000);
  const rows: PaymentRow[] = (data ?? []).map((raw) => {
    const row = record(raw),
      form = record(row.form_data);
    return {
      id: text(row.id),
      paymentNo: text(row.payment_no),
      subject: text(form.subject) || text(record(row.procurement_requests).request_no),
      requester: text(record(row.profiles).full_name) || text(form.requesterName),
      department: text(form.departmentName),
      sourceNo: text(record(row.procurement_requests).request_no),
      amount: Number(row.total_amount),
      status: text(row.status),
      createdAt: text(row.created_at),
      step: Number(row.current_step),
    };
  });
  return {
    rows,
    error: error
      ? toSafeActionError("get-payments", error, "โหลดรายการเบิกจ่ายไม่สำเร็จ กรุณาลองใหม่")
      : null,
  };
}

export async function getPayment(paymentNo: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("payment_requests")
    .select(
      "id, payment_no, requester_id, procurement_request_id, status, current_step, created_at, updated_at, submitted_at, invoice_no, invoice_date, subtotal, vat_amount, total_amount, delivery_detail, form_data, idempotency_key, procurement_requests(request_no,title,estimated_amount,plan_name), payment_items(line_no,description,attachment_type,document_no,quantity,unit_price), payment_attachments(id,file_name,mime_type,size_bytes,created_at), payment_workflow_tasks(id,step_no,step_name,required_role,assignee_id,status,due_at), payment_workflow_actions(id,action,comment,created_at,profiles!payment_workflow_actions_actor_id_fkey(full_name))",
    )
    .eq("payment_no", paymentNo)
    .order("created_at", { referencedTable: "payment_attachments", ascending: true })
    .order("id", { referencedTable: "payment_attachments", ascending: true })
    .order("created_at", { referencedTable: "payment_workflow_actions", ascending: false })
    .maybeSingle();
  return {
    data: data as unknown as PaymentRecord | null,
    error: error
      ? toSafeActionError("get-payment", error, "โหลดคำขอเบิกจ่ายไม่สำเร็จ กรุณาลองใหม่")
      : null,
  };
}

export async function getPaymentAccess(payment: PaymentRecord) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from("profiles").select("role,active").eq("id", user.id).maybeSingle()
    : { data: null };
  const task = payment.payment_workflow_tasks.find(
    (t) => t.status === "pending" && t.step_no === payment.current_step,
  );
  return {
    task,
    owner: Boolean(user && profile?.active && user.id === payment.requester_id),
    canAct: Boolean(
      user &&
      profile?.active &&
      task &&
      (profile.role === "admin" ||
        task.assignee_id === user.id ||
        (!task.assignee_id && task.required_role === profile.role)),
    ),
  };
}
