import "server-only";
import { createClient } from "@/lib/supabase/server";
import { toSafeActionError } from "@/lib/server/action-errors";
import { readPage } from "@/lib/server/read-page";
import { LIST_PAGE_SIZE, literalSearchPattern, type ListFilters } from "@/lib/pagination";
import { w804DraftSchema } from "@/app/requests/w804/model";
import type { W804SavedDraft } from "../types";

export async function getW804Draft(requestNo: string): Promise<{
  record: W804SavedDraft | null;
  error: string | null;
}> {
  if (!/^W804-\d{3,}$/.test(requestNo)) return { record: null, error: "เลขคำขอ ว804 ไม่ถูกต้อง" };
  try {
    const client = await createClient();
    const { data, error } = await client
      .from("w804_document_sets")
      .select("id,request_no,revision,form_data")
      .eq("request_no", requestNo)
      .maybeSingle();
    if (error) throw error;
    if (!data) return { record: null, error: "ไม่พบคำขอ ว804 หรือคุณไม่มีสิทธิ์เข้าถึง" };
    const parsed = w804DraftSchema.safeParse(data.form_data);
    if (!parsed.success) throw new Error("Unsupported W804 draft format");
    return {
      record: {
        id: data.id,
        requestNo: data.request_no,
        revision: data.revision,
        data: parsed.data,
      },
      error: null,
    };
  } catch (error) {
    return {
      record: null,
      error: toSafeActionError("get-w804", error, "โหลดคำขอ ว804 ไม่สำเร็จ กรุณาลองใหม่"),
    };
  }
}

export async function getW804Page(filters: ListFilters) {
  try {
    const client = await createClient();
    return await readPage(
      (from, to) => {
        let query = client
          .from("w804_document_sets")
          .select("id,request_no,title,fiscal_year,total_amount,revision,created_at,updated_at", {
            count: "exact",
          });
        if (filters.q)
          query = query.filter("search_text", "imatch", literalSearchPattern(filters.q));
        return query
          .order("created_at", { ascending: false })
          .order("id", { ascending: false })
          .range(from, to);
      },
      filters.page,
      LIST_PAGE_SIZE,
    );
  } catch (error) {
    return {
      rows: [],
      total: 0,
      page: 1,
      error: toSafeActionError("list-w804", error, "โหลดทะเบียน ว804 ไม่สำเร็จ กรุณาลองใหม่"),
    };
  }
}
