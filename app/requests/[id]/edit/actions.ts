"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toSafeActionError } from "@/lib/server/action-errors";
import {
  newRequestInputSchema,
  parseRequestFormData,
  type NewRequestInput,
} from "../../new/schemas";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type VendorRpcRow = {
  id: string;
  display_name: string;
};

export async function updateReturnedRequest(requestId: string, input: NewRequestInput) {
  if (!uuidPattern.test(requestId)) return { error: "ไม่พบคำขอที่ต้องการแก้ไข" };

  const parsedInput = newRequestInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return {
      error: parsedInput.error.issues.some((issue) => issue.path[0] === "requiredDate")
        ? "กรุณาตรวจสอบวันที่ต้องการใช้ โดยระบุวันที่วันนี้หรือวันถัดไปตามเงื่อนไขของระบบ"
        : "ข้อมูลคำขอยังไม่ครบถ้วน กรุณาตรวจสอบอีกครั้ง",
    };
  }

  const parsedFormData = parseRequestFormData(parsedInput.data.formData);
  if (!parsedFormData.success) {
    return { error: "ข้อมูลแบบฟอร์มไม่ถูกต้อง กรุณาตรวจสอบอีกครั้ง" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบใหม่" };

  // The RPC rechecks ownership/status under a row lock. This read also prevents
  // changing the form family through a crafted server-action payload.
  const { data: existing, error: readError } = await supabase
    .from("procurement_requests")
    .select("form_data")
    .eq("id", requestId)
    .eq("requester_id", user.id)
    .eq("status", "returned")
    .maybeSingle();
  if (readError || !existing) return { error: "ไม่พบคำขอที่แก้ไขได้หรือคำขอไม่ได้ถูกส่งกลับ" };
  const storedForm: unknown = existing.form_data;
  if (
    !storedForm ||
    typeof storedForm !== "object" ||
    !("formType" in storedForm) ||
    storedForm.formType !== parsedFormData.data.formType
  ) {
    return { error: "ไม่สามารถเปลี่ยนประเภทแบบฟอร์มของคำขอเดิมได้" };
  }
  if (
    parsedFormData.data.formType === "w119" &&
    parsedInput.data.items.some((item) => item.market_price == null || !item.price_source?.trim())
  ) {
    return { error: "กรุณาระบุราคากลางและแหล่งที่มาของราคาทุกรายการในแบบ ว119" };
  }

  let submittedFormData: Record<string, unknown> = parsedFormData.data;
  const vendor = parsedFormData.data.formType === "standard" ? parsedFormData.data.vendor : null;
  if (vendor?.type === "registered") {
    if (!uuidPattern.test(vendor.id)) {
      return { error: "ไม่พบผู้ประกอบการที่เลือก กรุณาค้นหาและเลือกใหม่" };
    }
    const { data: vendorData, error: vendorError } = await supabase.rpc("resolve_vendor", {
      vendor_id: vendor.id,
    });
    const resolvedVendor = (
      Array.isArray(vendorData) ? vendorData[0] : vendorData
    ) as VendorRpcRow | null;
    if (vendorError || !resolvedVendor) {
      return { error: "ไม่พบผู้ประกอบการที่เลือกในฐานรายชื่อ กรุณาค้นหาและเลือกใหม่" };
    }
    submittedFormData = {
      ...parsedFormData.data,
      vendor: {
        type: "registered",
        id: String(resolvedVendor.id),
        name: String(resolvedVendor.display_name),
      },
    };
  }

  const request = parsedInput.data;
  const { error } = await supabase.rpc("update_returned_procurement_request", {
    target_request_id: requestId,
    request_kind: request.kind,
    request_title: request.title,
    request_rationale: request.rationale,
    request_required_date: request.requiredDate,
    request_budget_year: request.budgetYear,
    request_fund_source: request.fundSource,
    request_plan_name: request.planName,
    request_expense_category: request.expenseCategory,
    request_form_data: submittedFormData,
    request_items: request.items,
  });

  if (error) {
    return {
      error: toSafeActionError(
        "update-returned-request",
        error,
        "บันทึกการแก้ไขไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองใหม่",
      ),
    };
  }
  return { error: null };
}

export async function resubmitReturnedRequest(requestId: string) {
  if (!uuidPattern.test(requestId)) return { error: "ไม่พบคำขอที่ต้องการส่ง", requestNo: null };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบใหม่", requestNo: null };

  const { data, error } = await supabase.rpc("resubmit_returned_procurement_request", {
    target_request_id: requestId,
  });
  if (error) {
    return {
      error: toSafeActionError(
        "resubmit-returned-request",
        error,
        "บันทึกข้อมูลแล้ว แต่ยังส่งคำขอเข้ากระบวนการไม่ได้ กรุณาลองใหม่",
      ),
      requestNo: null,
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  const requestNo = typeof row?.request_no === "string" ? row.request_no : null;
  if (requestNo) {
    revalidatePath(`/requests/${requestNo}`);
    revalidatePath("/requests");
    revalidatePath("/tasks");
  }
  return { error: null, requestNo };
}
