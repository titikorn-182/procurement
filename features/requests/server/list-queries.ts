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
import { toRequestListRow } from "../list-model";
import type { RequestRow } from "../types";

export async function getRequestPage(
  filters: ListFilters,
  size = LIST_PAGE_SIZE,
): Promise<PageResult<RequestRow>> {
  try {
    const supabase = await createClient();
    const result = await readPage(
      (from, to) => {
        let query = supabase
          .from("procurement_request_list")
          .select(
            "id,request_no,kind,title,estimated_amount,budget_year,status,current_step,created_at,required_date,department_name,requester_name,list_status,search_text",
            { count: "exact" },
          );
        if (filters.q)
          query = query.filter("search_text", "imatch", literalSearchPattern(filters.q));
        if (filters.status !== "all") query = query.eq("list_status", filters.status);
        if (filters.kind !== "all")
          query = query.eq("kind", filters.kind === "hire" ? "hire" : "purchase");
        return query
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to);
      },
      filters.page,
      size,
    );
    return { ...result, rows: result.rows.map(toRequestListRow) };
  } catch (error) {
    return {
      rows: [],
      total: 0,
      page: 1,
      error: toSafeActionError("get-request-page", error, "โหลดรายการคำขอไม่สำเร็จ กรุณาลองใหม่"),
    };
  }
}
