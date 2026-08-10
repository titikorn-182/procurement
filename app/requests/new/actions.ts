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
  formData?: Record<string, unknown>;
  items: Array<{ line_no: number; description: string; quantity: number; unit: string; unit_price: number; market_price?: number; price_source?: string }>;
};

type AdvanceFundingOption =
  | "borrow_before_purchase"
  | "reimburse_after_purchase"
  | "faculty_direct_pay_credit_vendor";

const advanceFundingOptions: readonly AdvanceFundingOption[] = [
  "borrow_before_purchase",
  "reimburse_after_purchase",
  "faculty_direct_pay_credit_vendor",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isAdvanceFundingOption(value: unknown): value is AdvanceFundingOption {
  return typeof value === "string" && advanceFundingOptions.includes(value as AdvanceFundingOption);
}

export async function submitRequest(input: NewRequestInput) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบใหม่", requestNo: null };
  if (!input.title.trim() || !input.rationale.trim() || !input.requiredDate || input.items.length === 0) {
    return { error: "ข้อมูลคำขอยังไม่ครบถ้วน กรุณาตรวจสอบทุกขั้นตอน", requestNo: null };
  }
  let submittedFormData: Record<string, unknown> = input.formData ?? {};
  if ("advanceFundingOption" in submittedFormData) {
    const advanceFundingOption = submittedFormData.advanceFundingOption;
    const budgetCodes = submittedFormData.budgetCodes;
    const vendor = submittedFormData.vendor;

    if (!isAdvanceFundingOption(advanceFundingOption)) {
      return { error: "กรุณาเลือกความต้องการยืมเงินให้ถูกต้อง", requestNo: null };
    }
    if (
      !isRecord(budgetCodes)
      || typeof budgetCodes.departmentCode !== "string"
      || !budgetCodes.departmentCode.trim()
      || typeof budgetCodes.fundCode !== "string"
      || !budgetCodes.fundCode.trim()
      || typeof budgetCodes.activityCode !== "string"
      || !budgetCodes.activityCode.trim()
    ) {
      return { error: "กรุณาระบุรหัสหน่วยงาน รหัสกองทุน และรหัสกิจกรรมให้ครบถ้วน", requestNo: null };
    }

    let normalizedVendor: Record<string, string | null> | null = null;
    if (vendor !== null && vendor !== undefined) {
      if (!isRecord(vendor) || (vendor.type !== "registered" && vendor.type !== "new")) {
        return { error: "ข้อมูลผู้ประกอบการไม่ถูกต้อง กรุณาเลือกใหม่", requestNo: null };
      }
      const vendorId = typeof vendor.id === "string" && vendor.id.trim() ? vendor.id.trim() : null;
      const vendorName = typeof vendor.name === "string" && vendor.name.trim() ? vendor.name.trim() : null;
      if (vendor.type === "registered" && !vendorId) {
        return { error: "กรุณาเลือกผู้ประกอบการจากรายชื่อในระบบ", requestNo: null };
      }
      if (vendor.type === "new" && !vendorName) {
        return { error: "กรุณาระบุชื่อผู้ประกอบการหรือร้านค้ารายใหม่", requestNo: null };
      }
      normalizedVendor = { type: vendor.type, id: vendorId, name: vendorName };
    }
    if (advanceFundingOption === "faculty_direct_pay_credit_vendor" && !normalizedVendor) {
      return { error: "กรุณาระบุผู้ประกอบการสำหรับกรณีจ่ายตรงกับร้านค้า", requestNo: null };
    }

    submittedFormData = {
      ...submittedFormData,
      advanceFundingOption,
      requiresLoanAgreement: advanceFundingOption === "borrow_before_purchase",
      vendor: normalizedVendor,
      requiresVendorDocuments: normalizedVendor?.type === "new",
      budgetCodes: {
        departmentCode: budgetCodes.departmentCode.trim(),
        fundCode: budgetCodes.fundCode.trim(),
        activityCode: budgetCodes.activityCode.trim(),
      },
    };
  }
  let response = await supabase.rpc("submit_procurement_request", {
    request_kind: input.kind,
    request_title: input.title,
    request_rationale: input.rationale,
    request_required_date: input.requiredDate,
    request_budget_year: input.budgetYear,
    request_fund_source: input.fundSource,
    request_plan_name: input.planName,
    request_expense_category: input.expenseCategory,
    request_form_data: submittedFormData,
    request_items: input.items,
  });
  if (response.error?.code === "PGRST202") {
    if (Object.keys(submittedFormData).length > 0) {
      return { error: "ฐานข้อมูลยังไม่รองรับข้อมูลแบบฟอร์มรุ่นนี้ กรุณาให้ผู้ดูแลระบบอัปเดตฐานข้อมูลก่อนส่งคำขอ", requestNo: null };
    }
    response = await supabase.rpc("submit_procurement_request", {
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
  }
  const { data, error } = response;
  if (error) return { error: error.message, requestNo: null };
  const row = Array.isArray(data) ? data[0] : data;
  return { error: null, requestNo: row?.request_no as string | undefined };
}
