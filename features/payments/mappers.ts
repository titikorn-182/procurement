import type { Tables } from "@/lib/supabase/database.types";
import type { SourceRequest } from "./types";
import { record, text } from "./model";
import { readPol01Checklist } from "@/app/requests/pol01-checklist-schema";

export type PayableSourceRecord = Pick<
  Tables<"procurement_requests">,
  | "id"
  | "request_no"
  | "title"
  | "rationale"
  | "budget_year"
  | "fund_source"
  | "plan_name"
  | "expense_category"
  | "estimated_amount"
  | "form_data"
> & {
  departments: Pick<Tables<"departments">, "name_th"> | null;
  profiles: Pick<Tables<"profiles">, "full_name"> | null;
  request_items: Array<
    Pick<Tables<"request_items">, "line_no" | "description" | "quantity" | "unit_price">
  >;
  payment_requests: Array<Pick<Tables<"payment_requests">, "total_amount" | "status">>;
};
export function toPaymentSource(row: PayableSourceRecord): SourceRequest {
  const paid = (row.payment_requests ?? [])
    .filter((p) => !["cancelled", "draft"].includes(p.status))
    .reduce((sum, p) => sum + Number(p.total_amount), 0);
  const formData = record(row.form_data);
  const vendor = record(formData.vendor);
  const budgetCodes = record(formData.budgetCodes);
  const department = row.departments;
  const requester = row.profiles;
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
    approvedDate: "",
    approved: Number(row.estimated_amount),
    paid,
    vendorName: text(vendor.name),
    departmentCode: text(budgetCodes.departmentCode),
    fundCode: text(budgetCodes.fundCode),
    activityCode: text(budgetCodes.activityCode),
    checklistCategories: readPol01Checklist(formData.documentChecklist, {
      newVendor: vendor.type === "new",
      borrowing: false,
    }).categories,
    isNewVendor: vendor.type === "new",
    items: [...(row.request_items ?? [])]
      .sort((a, b) => a.line_no - b.line_no)
      .map((item) => ({
        description: item.description,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unit_price),
      })),
  };
}
