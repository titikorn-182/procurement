"use server";

import { createClient } from "@/lib/supabase/server";
import { toSafeActionError } from "@/lib/server/action-errors";
import {
  findLocalVendorById,
  normalizeVendorSearchTerm,
  searchLocalVendors,
} from "../../lib/vendor-directory.server";
import { newRequestInputSchema, parseRequestFormData, type NewRequestInput } from "./schemas";
import { getRequestDraftErrorMessage } from "./submission-errors";

export type { NewRequestInput } from "./schemas";

export type VendorSearchItem = {
  id: string;
  name: string;
};

export type VendorSearchResult = {
  vendors: VendorSearchItem[];
  total: number;
  source: "database" | "local" | "unavailable";
  error: string | null;
};

type VendorRpcRow = {
  id: string;
  display_name: string;
  total_count: number | string;
};

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function searchVendors(rawQuery: string): Promise<VendorSearchResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      vendors: [],
      total: 0,
      source: "unavailable",
      error: "กรุณาเข้าสู่ระบบใหม่เพื่อค้นหารายชื่อผู้ประกอบการ",
    };
  }

  const query = typeof rawQuery === "string" ? rawQuery.trim().slice(0, 120) : "";
  if (Array.from(query).length < 2) {
    return { vendors: [], total: 0, source: "database", error: null };
  }

  const searchName = normalizeVendorSearchTerm(query);
  if (Array.from(searchName).length < 2) {
    return { vendors: [], total: 0, source: "database", error: null };
  }
  const { data, error } = await supabase.rpc("search_vendors", {
    vendor_query: searchName,
    max_results: 20,
  });

  if (!error) {
    const vendors = (data ?? []) as unknown as VendorRpcRow[];
    return {
      vendors: vendors.map((vendor) => ({
        id: String(vendor.id),
        name: String(vendor.display_name),
      })),
      total: Number(vendors[0]?.total_count ?? vendors.length),
      source: "database",
      error: null,
    };
  }

  const localResult = await searchLocalVendors(query);
  if (localResult) {
    return {
      ...localResult,
      source: "local",
      error: null,
    };
  }

  return {
    vendors: [],
    total: 0,
    source: "unavailable",
    error: toSafeActionError(
      "search-vendors",
      error,
      "ฐานรายชื่อผู้ประกอบการยังไม่พร้อมใช้งาน กรุณาเลือกผู้ประกอบการรายใหม่",
    ),
  };
}

async function findRegisteredVendor(
  supabase: Awaited<ReturnType<typeof createClient>>,
  vendorId: string,
) {
  if (uuidPattern.test(vendorId)) {
    const { data, error } = await supabase.rpc("resolve_vendor", { vendor_id: vendorId });
    const vendor = Array.isArray(data) ? data[0] : data;

    if (!error && vendor) {
      return { id: String(vendor.id), name: String(vendor.display_name) };
    }
  }

  return findLocalVendorById(vendorId);
}

export async function createRequestDraft(input: NewRequestInput) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบใหม่", requestId: null, requestNo: null };

  const parsedInput = newRequestInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return {
      error: "ข้อมูลคำขอยังไม่ครบถ้วน กรุณาตรวจสอบทุกขั้นตอน",
      requestId: null,
      requestNo: null,
    };
  }

  const request = parsedInput.data;
  const parsedFormData = parseRequestFormData(request.formData);
  if (!parsedFormData.success) {
    return {
      error: "ข้อมูลแบบฟอร์มไม่ถูกต้อง กรุณาตรวจสอบและส่งใหม่",
      requestId: null,
      requestNo: null,
    };
  }

  let submittedFormData: Record<string, unknown> = parsedFormData.data;
  if (parsedFormData.data.formType === "standard") {
    const { vendor } = parsedFormData.data;
    if (vendor?.type === "registered") {
      const registeredVendor = await findRegisteredVendor(supabase, vendor.id);
      if (!registeredVendor) {
        return {
          error: "ไม่พบผู้ประกอบการที่เลือกในฐานรายชื่อ กรุณาค้นหาและเลือกใหม่",
          requestId: null,
          requestNo: null,
        };
      }
      submittedFormData = {
        ...parsedFormData.data,
        vendor: { type: "registered", id: registeredVendor.id, name: registeredVendor.name },
      };
    }
  } else {
    const invalidW119Item = request.items.some(
      (item) => item.market_price === undefined || !item.price_source?.trim(),
    );
    if (invalidW119Item) {
      return {
        error: "รายการตามแบบ ว119 ต้องระบุราคากลางและแหล่งที่มาของราคาให้ครบถ้วน",
        requestId: null,
        requestNo: null,
      };
    }
    submittedFormData = {
      ...parsedFormData.data,
      requiresItemAttachment: request.items.length > 10,
    };
  }

  if (JSON.stringify(submittedFormData).length > 20_000) {
    return { error: "ข้อมูลแบบฟอร์มมีขนาดใหญ่เกินไป", requestId: null, requestNo: null };
  }

  const { data, error } = await supabase.rpc("create_procurement_request_draft", {
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
      error: toSafeActionError("submit-request", error, getRequestDraftErrorMessage(error)),
      requestId: null,
      requestNo: null,
    };
  }
  const row = Array.isArray(data) ? data[0] : data;
  return {
    error: null,
    requestId: row?.id as string | undefined,
    requestNo: row?.request_no as string | undefined,
  };
}

export async function submitRequestDraft(requestId: string) {
  if (!uuidPattern.test(requestId)) {
    return { error: "ไม่พบฉบับร่างที่ต้องการส่ง", requestNo: null };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "กรุณาเข้าสู่ระบบใหม่", requestNo: null };

  const { data, error } = await supabase.rpc("submit_procurement_request_draft", {
    target_request_id: requestId,
  });
  if (error) {
    return {
      error: toSafeActionError(
        "submit-request-draft",
        error,
        "อัปโหลดเอกสารแล้ว แต่ยังส่งคำขอไม่ได้ คำขอยังคงเป็นฉบับร่าง กรุณาลองอีกครั้ง",
      ),
      requestNo: null,
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return { error: null, requestNo: row?.request_no as string | undefined };
}
