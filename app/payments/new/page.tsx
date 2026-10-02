import { AppShell } from "../../components/app-shell";
import { PageHeader } from "../../components/ui";
import { createClient } from "@/lib/supabase/server";
import { toSafeActionError } from "@/lib/server/action-errors";
import { PaymentForm } from "./payment-form";
import type { SourceRequest } from "./types";

type RelatedName = { name_th?: string } | { full_name?: string };
type PayableRequestRow = {
  id: string;
  request_no: string;
  title: string;
  rationale: string;
  budget_year: number;
  fund_source: string;
  plan_name: string | null;
  expense_category: string | null;
  estimated_amount: number | string;
  completed_at: string | null;
  form_data: unknown;
  departments: RelatedName | RelatedName[] | null;
  profiles: RelatedName | RelatedName[] | null;
  request_items: Array<{
    line_no: number;
    description: string;
    quantity: number | string;
    unit_price: number | string;
  }> | null;
  payment_requests: Array<{ total_amount: number | string; status: string }> | null;
};

function firstRelation(value: RelatedName | RelatedName[] | null) {
  return Array.isArray(value) ? value[0] : value;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function text(value: unknown) {
  return typeof value === "string" ? value : "";
}

export default async function NewPaymentPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("procurement_requests")
    .select(
      "id, request_no, title, rationale, budget_year, fund_source, plan_name, expense_category, estimated_amount, status, completed_at, form_data, departments(name_th), profiles!procurement_requests_requester_id_fkey(full_name), request_items(line_no,description,quantity,unit_price), payment_requests(total_amount,status)",
    )
    .in("status", ["approved", "ordered", "completed"])
    .order("created_at", { ascending: false });
  const requests: SourceRequest[] = ((data ?? []) as unknown as PayableRequestRow[]).map((row) => {
    const paid = (row.payment_requests ?? [])
      .filter((p) => !["cancelled", "draft"].includes(p.status))
      .reduce((sum, p) => sum + Number(p.total_amount), 0);
    const formData = record(row.form_data);
    const vendor = record(formData.vendor);
    const budgetCodes = record(formData.budgetCodes);
    const department = firstRelation(row.departments);
    const requester = firstRelation(row.profiles);
    return {
      id: row.id,
      requestNo: row.request_no,
      title: row.title,
      rationale: row.rationale,
      requesterName: requester && "full_name" in requester ? requester.full_name || "—" : "—",
      departmentName: department && "name_th" in department ? department.name_th || "—" : "—",
      budgetYear: Number(row.budget_year),
      fundSource: row.fund_source,
      planName: row.plan_name ?? "",
      expenseCategory: row.expense_category ?? "",
      approvedDate: row.completed_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      approved: Number(row.estimated_amount),
      paid,
      vendorName: text(vendor.name),
      departmentCode: text(budgetCodes.departmentCode),
      fundCode: text(budgetCodes.fundCode),
      activityCode: text(budgetCodes.activityCode),
      items: (row.request_items ?? [])
        .sort((a, b) => a.line_no - b.line_no)
        .map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unit_price),
        })),
    };
  });
  const safeError = error
    ? toSafeActionError("get-payable-requests", error, "ไม่สามารถโหลดคำขอที่เบิกจ่ายได้")
    : null;
  return (
    <AppShell>
      <PageHeader
        title="สร้างคำขอเบิกจ่ายจัดซื้อจัดจ้าง"
        description="เลือกคำขอที่อนุมัติแล้วและส่งข้อมูลใบแจ้งหนี้เข้าสู่กระบวนการตรวจสอบ"
      />
      {safeError ? (
        <div
          role="alert"
          className="mt-5 border border-red-300 bg-[var(--red-soft)] p-4 text-[var(--red)]"
        >
          {safeError}
        </div>
      ) : (
        <PaymentForm requests={requests} />
      )}
    </AppShell>
  );
}
