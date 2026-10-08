"use server";

import { createClient } from "@/lib/supabase/server";
import { toSafeActionError } from "@/lib/server/action-errors";
import { createdVendorSchema, vendorNameSchema, type VendorCreateResult } from "./vendor-schema";

async function getVendorAdminContext() {
  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.getUser();
  if (authError || !data.user) return null;
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", data.user.id)
    .maybeSingle();
  return !error && profile?.active === true && profile.role === "admin" ? supabase : null;
}

/** A UI hint only. The write action and database each re-check the current permission. */
export async function canManageVendorDirectory(): Promise<boolean> {
  try {
    return (await getVendorAdminContext()) !== null;
  } catch {
    return false;
  }
}

export async function createVendor(rawName: unknown): Promise<VendorCreateResult> {
  const fail = (error: string): VendorCreateResult => ({ vendor: null, created: false, error });
  try {
    const supabase = await getVendorAdminContext();
    if (!supabase)
      return fail(
        "เฉพาะผู้ดูแลระบบที่ใช้งานอยู่เท่านั้นที่เพิ่มรายชื่อได้ กรุณาตรวจสอบการเข้าสู่ระบบ",
      );
    const parsed = vendorNameSchema.safeParse(rawName);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
    const { data, error } = await supabase.rpc("admin_create_vendor", {
      vendor_name: parsed.data,
    });
    if (error) {
      if (error.code === "42501") return fail("สิทธิ์ผู้ดูแลระบบเปลี่ยนไป กรุณาเข้าสู่ระบบใหม่");
      if (error.code === "22023")
        return fail("กรุณาระบุชื่อผู้ประกอบการ 2–200 ตัวอักษร ไม่ใช้เฉพาะสัญลักษณ์");
      if (error.code === "55000")
        return fail("มีรายชื่อนี้ในระบบแต่ถูกปิดใช้งาน กรุณาตรวจสอบฐานรายชื่อก่อนเพิ่มซ้ำ");
      if (error.code === "PGRST202" || error.code === "42883") {
        return fail(
          "ระบบเพิ่มผู้ประกอบการยังไม่พร้อมใช้งาน กรุณาติดตั้ง migration สำหรับรายชื่อผู้ประกอบการก่อน",
        );
      }
      return fail(
        toSafeActionError("create-vendor", error, "บันทึกผู้ประกอบการไม่สำเร็จ กรุณาลองใหม่"),
      );
    }
    const result = createdVendorSchema.safeParse(Array.isArray(data) ? data[0] : data);
    if (!result.success) {
      return fail("ไม่สามารถยืนยันผลการบันทึกได้ กรุณาค้นหาชื่อนี้ก่อนลองเพิ่มอีกครั้ง");
    }
    return {
      vendor: { id: result.data.id, name: result.data.display_name },
      created: result.data.created,
      error: null,
    };
  } catch (error) {
    return fail(
      toSafeActionError(
        "create-vendor",
        error,
        "บันทึกผู้ประกอบการไม่สำเร็จ กรุณาค้นหาชื่อนี้ก่อนลองใหม่",
      ),
    );
  }
}
