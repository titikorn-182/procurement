"use server";

import { createClient } from "@/lib/supabase/server";

export type NewRequestInput = {
  kind: "purchase" | "hire";
  title: string;
  rationale: string;
  requiredDate: string;
  budgetYear: number;
  fundSource: string;
  planName: string;
  expenseCategory: string;
  items: Array<{ line_no: number; description: string; quantity: number; unit: string; unit_price: number }>;
};

export async function submitRequest(input: NewRequestInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบใหม่", requestNo: null };
  if (!input.title.trim() || !input.rationale.trim() || !input.requiredDate || input.items.length === 0) {
    return { error: "ข้อมูลคำขอยังไม่ครบถ้วน กรุณาตรวจสอบทุกขั้นตอน", requestNo: null };
  }
  const { data, error } = await supabase.rpc("submit_procurement_request", {
    request_kind: input.kind,
    request_title: input.title,
    request_rationale: input.rationale,
    request_required_date: input.requiredDate,
    request_budget_year: input.budgetYear,
    request_fund_source: input.fundSource,
    request_plan_name: input.planName,
    request_expense_category: input.expenseCategory,
    request_items: input.items,
  });
  if (error) return { error: error.message, requestNo: null };
  const row = Array.isArray(data) ? data[0] : data;
  return { error: null, requestNo: row?.request_no as string | undefined };
}
