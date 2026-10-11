"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toSafeActionError } from "@/lib/server/action-errors";
import { catalogQuerySchema } from "../requests/new/catalog-schema";
import {
  CATALOG_IMAGE_MAX_BYTES,
  catalogManagementDataSchema,
  catalogSaveSchema,
  catalogSavedSchema,
  type CatalogAccess,
  type CatalogImageUploadResult,
  type CatalogManageResult,
  type CatalogSaveResult,
} from "./schema";
import { validateCatalogImage } from "./image-validation";

const readerRoles = new Set([
  "user",
  "procurement_staff",
  "finance_staff",
  "head_procurement",
  "deputy_secretary",
  "deputy_finance",
  "dean",
  "head_office",
  "admin",
]);
async function context() {
  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user) return null;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", data.user.id)
    .maybeSingle();
  if (error || profile?.active !== true || !readerRoles.has(profile.role)) return null;
  return { supabase, userId: data.user.id, canManage: profile.role === "admin" };
}

/** A display hint only; every write and RPC independently enforces live authorization. */
export async function getCatalogAccess(): Promise<CatalogAccess> {
  try {
    const current = await context();
    return current
      ? { canRead: true, canManage: current.canManage, error: null }
      : {
          canRead: false,
          canManage: false,
          error: "กรุณาเข้าสู่ระบบด้วยบัญชีที่เปิดใช้งานเพื่อดู Procurement Data Catalog",
        };
  } catch (error) {
    return {
      canRead: false,
      canManage: false,
      error: toSafeActionError("catalog-access", error, "ตรวจสอบสิทธิ์ไม่สำเร็จ กรุณาลองใหม่"),
    };
  }
}

export async function searchCatalogManagement(input: unknown): Promise<CatalogManageResult> {
  const parsed = catalogQuerySchema.safeParse(input);
  if (!parsed.success) return { data: null, error: "เงื่อนไขค้นหาไม่ถูกต้อง กรุณาลองใหม่" };
  try {
    const current = await context();
    if (!current?.canManage)
      return { data: null, error: "เฉพาะผู้ดูแลระบบที่เปิดใช้งานเท่านั้นที่จัดการแค็ตตาล็อกได้" };
    const { data, error } = await current.supabase.rpc("search_procurement_catalog_admin", {
      catalog_query: parsed.data.query,
      category_filter: parsed.data.category,
      page_number: parsed.data.page,
    });
    if (error)
      return {
        data: null,
        error: toSafeActionError(
          "catalog-admin-search",
          error,
          "โหลดข้อมูลไม่สำเร็จ กรุณาตรวจ migration และสิทธิ์ของผู้ดูแลระบบ แล้วลองใหม่",
        ),
      };
    const result = catalogManagementDataSchema.safeParse(data);
    return result.success
      ? { data: result.data, error: null }
      : { data: null, error: "ข้อมูลแค็ตตาล็อกไม่ตรงตามโครงสร้าง กรุณาตรวจฐานข้อมูล" };
  } catch (error) {
    return {
      data: null,
      error: toSafeActionError(
        "catalog-admin-search",
        error,
        "เชื่อมต่อแค็ตตาล็อกไม่สำเร็จ กรุณาลองใหม่",
      ),
    };
  }
}

export async function saveCatalogItem(input: unknown): Promise<CatalogSaveResult> {
  const parsed = catalogSaveSchema.safeParse(input);
  if (!parsed.success)
    return { data: null, error: parsed.error.issues[0]?.message ?? "กรุณาตรวจสอบข้อมูลรายการ" };
  try {
    const current = await context();
    if (!current?.canManage)
      return { data: null, error: "เฉพาะผู้ดูแลระบบที่เปิดใช้งานเท่านั้นที่บันทึกข้อมูลได้" };
    const { data, error } = await current.supabase.rpc("save_procurement_catalog_item", {
      payload: parsed.data,
    });
    if (error) {
      if (error.code === "40001")
        return {
          data: null,
          error:
            "รายการนี้มีการแก้ไขจากหน้าต่างอื่นแล้ว กรุณาโหลดข้อมูลล่าสุดก่อนบันทึกใหม่ ข้อมูลที่กรอกยังไม่ถูกลบ",
        };
      if (error.code === "23505")
        return {
          data: null,
          error: "มีรหัสรายการนี้อยู่แล้ว กรุณาค้นหารายการเดิมก่อนเพิ่ม หรือเปลี่ยนรหัส",
        };
      if (error.code === "42501")
        return { data: null, error: "สิทธิ์ผู้ดูแลระบบเปลี่ยนไป กรุณาเข้าสู่ระบบใหม่" };
      if (error.code === "22023" || error.code === "23514")
        return {
          data: null,
          error:
            "ข้อมูลไม่ผ่านการตรวจสอบ หากแก้ชื่อ คุณลักษณะ หรือหน่วยนับ ต้องบันทึกราคาอ้างอิงใหม่ด้วย กรุณาตรวจวันที่ รหัสหมวด และรูปภาพ",
        };
      return {
        data: null,
        error: toSafeActionError(
          "catalog-save",
          error,
          "บันทึกไม่สำเร็จ กรุณาค้นหาข้อมูลล่าสุดก่อนลองอีกครั้ง รูปภาพที่อัปโหลดแล้วไม่ต้องอัปโหลดซ้ำ",
        ),
      };
    }
    const saved = catalogSavedSchema.safeParse(data);
    if (!saved.success)
      return {
        data: null,
        error: "ยังยืนยันผลการบันทึกไม่ได้ กรุณาค้นหารายการนี้ก่อนลองบันทึกอีกครั้ง",
      };
    revalidatePath("/catalog");
    revalidatePath("/requests/new");
    return { data: saved.data, error: null };
  } catch (error) {
    return {
      data: null,
      error: toSafeActionError(
        "catalog-save",
        error,
        "เชื่อมต่อขณะบันทึกไม่สำเร็จ กรุณาค้นหารายการนี้ก่อนลองใหม่ รูปภาพที่อัปโหลดแล้วไม่ต้องอัปโหลดซ้ำ",
      ),
    };
  }
}

export async function uploadCatalogImage(formData: FormData): Promise<CatalogImageUploadResult> {
  try {
    const current = await context();
    if (!current?.canManage)
      return { path: null, error: "เฉพาะผู้ดูแลระบบที่เปิดใช้งานเท่านั้นที่อัปโหลดรูปภาพได้" };
    if (!(formData instanceof FormData)) return { path: null, error: "ข้อมูลอัปโหลดไม่ถูกต้อง" };
    const itemId = z.uuid().safeParse(formData.get("itemId"));
    const file = formData.get("file");
    if (
      !itemId.success ||
      !(file instanceof File) ||
      file.size < 1 ||
      file.size > CATALOG_IMAGE_MAX_BYTES
    )
      return { path: null, error: "กรุณาเลือกรูปภาพสำหรับรายการนี้ ขนาดไม่เกิน 2 MB" };
    const bytes = new Uint8Array(await file.arrayBuffer());
    const checked = validateCatalogImage(bytes, file.type);
    if (!checked.image) return { path: null, error: checked.error };
    const path = `items/${itemId.data}/${current.userId}/${randomUUID()}.${checked.image.extension}`;
    const { error } = await current.supabase.storage.from("catalog-images").upload(path, bytes, {
      contentType: checked.image.contentType,
      upsert: false,
      cacheControl: "0",
    });
    if (error)
      return {
        path: null,
        error: toSafeActionError(
          "catalog-image-upload",
          error,
          "อัปโหลดรูปภาพไม่สำเร็จ กรุณาตรวจ migration และสิทธิ์พื้นที่จัดเก็บ แล้วลองใหม่",
        ),
      };
    // The form retains this immutable path across save retries. Never overwrite/delete files.
    return { path, error: null };
  } catch (error) {
    return {
      path: null,
      error: toSafeActionError(
        "catalog-image-upload",
        error,
        "อัปโหลดรูปภาพไม่สำเร็จ กรุณาลองใหม่",
      ),
    };
  }
}
