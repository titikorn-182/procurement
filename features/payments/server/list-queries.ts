import "server-only";
import { createClient } from "@/lib/supabase/server";
import { toSafeActionError } from "@/lib/server/action-errors";
import { readPage } from "@/lib/server/read-page";
import {
  LIST_PAGE_SIZE,
  literalSearchPattern,
  type ListFilters,
  type PageResult,
} from "@/lib/pagination";
import type { PaymentRow } from "./queries";
import { paymentStatusLabels } from "../model";
import type { Enums } from "@/lib/supabase/database.types";

function isPaymentStatus(value: string): value is Enums<"payment_status"> {
  return Object.hasOwn(paymentStatusLabels, value);
}

export async function getPaymentPage(filters: ListFilters): Promise<PageResult<PaymentRow>> {
  try {
    const supabase = await createClient();
    const result = await readPage(
      (from, to) => {
        let query = supabase
          .from("payment_request_list")
          .select(
            "id,payment_no,total_amount,status,current_step,created_at,subject,requester_name,department_name,source_no",
            { count: "exact" },
          );
        if (filters.q)
          query = query.filter("search_text", "imatch", literalSearchPattern(filters.q));
        if (isPaymentStatus(filters.status)) query = query.eq("status", filters.status);
        return query
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to);
      },
      filters.page,
      LIST_PAGE_SIZE,
    );
    return {
      ...result,
      rows: result.rows.map((row) => ({
        id: row.id,
        paymentNo: row.payment_no,
        subject: row.subject,
        requester: row.requester_name,
        department: row.department_name,
        sourceNo: row.source_no,
        amount: Number(row.total_amount),
        status: row.status,
        createdAt: row.created_at,
        step: row.current_step,
      })),
    };
  } catch (error) {
    return {
      rows: [],
      total: 0,
      page: 1,
      error: toSafeActionError(
        "get-payment-page",
        error,
        "โหลดรายการเบิกจ่ายไม่สำเร็จ กรุณาลองใหม่",
      ),
    };
  }
}
