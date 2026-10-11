import "server-only";

import { createClient } from "@/lib/supabase/server";
import { toSafeActionError } from "@/lib/server/action-errors";
import {
  catalogDataSchema,
  catalogQuerySchema,
  type CatalogResult,
} from "@/features/catalog/schema";

export async function searchProcurementCatalog(input: unknown): Promise<CatalogResult> {
  const parsed = catalogQuerySchema.safeParse(input);
  if (!parsed.success) return { data: null, error: "เงื่อนไขค้นหาไม่ถูกต้อง กรุณาลองใหม่" };
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return { data: null, error: "กรุณาเข้าสู่ระบบใหม่เพื่อค้นหาแค็ตตาล็อกราคากลาง" };
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("active")
      .eq("id", user.id)
      .maybeSingle();
    if (profileError || profile?.active !== true)
      return { data: null, error: "บัญชีนี้ยังไม่มีสิทธิ์ใช้งาน กรุณาติดต่อผู้ดูแลระบบ" };
    const { data, error } = await supabase.rpc("search_procurement_catalog", {
      catalog_query: parsed.data.query,
      category_filter: parsed.data.category,
      page_number: parsed.data.page,
    });
    if (error)
      return {
        data: null,
        error: toSafeActionError(
          "search-procurement-catalog",
          error,
          "ยังโหลดแค็ตตาล็อกไม่ได้ กรุณาลองใหม่ หากยังไม่สำเร็จให้ผู้ดูแลตรวจ migration การนำเข้าข้อมูล และสิทธิ์การอ่าน",
        ),
      };
    const result = catalogDataSchema.safeParse(data);
    if (
      !result.success ||
      result.data.items.some((item) => !item.active || item.status === "withdrawn")
    )
      return {
        data: null,
        error: "ข้อมูลแค็ตตาล็อกไม่ครบตามโครงสร้าง กรุณาแจ้งผู้ดูแลระบบตรวจข้อมูลนำเข้า",
      };
    return { data: result.data, error: null };
  } catch (error) {
    return {
      data: null,
      error: toSafeActionError(
        "search-procurement-catalog",
        error,
        "เชื่อมต่อแค็ตตาล็อกไม่สำเร็จ กรุณาลองใหม่ ข้อมูลคำขอที่กรอกไว้ยังอยู่",
      ),
    };
  }
}
