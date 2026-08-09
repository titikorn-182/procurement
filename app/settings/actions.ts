"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const settingKeys = new Set(["workflow", "budget", "documents", "notifications", "sla", "integrations"]);

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("กรุณาเข้าสู่ระบบใหม่");
  const { data: profile } = await supabase.from("profiles").select("role, active").eq("id", user.id).single();
  if (!profile?.active || profile.role !== "admin") throw new Error("เฉพาะผู้ดูแลระบบเท่านั้นที่แก้ไขการตั้งค่าได้");
  return { supabase, user };
}

export async function saveSystemSetting(key: string, value: Record<string, unknown>) {
  if (!settingKeys.has(key)) return { error: "ไม่พบหมวดการตั้งค่าที่ระบุ" };
  if (JSON.stringify(value).length > 10_000) return { error: "ข้อมูลการตั้งค่ามีขนาดใหญ่เกินไป" };
  try {
    const { supabase, user } = await requireAdmin();
    const { error } = await supabase.from("system_settings").upsert({ key, value, updated_by: user.id, updated_at: new Date().toISOString() });
    if (error) return { error: error.message };
    revalidatePath("/settings");
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "บันทึกการตั้งค่าไม่สำเร็จ" };
  }
}

export async function updateUserRole(userId: string, role: string, departmentId: string) {
  const roles = new Set(["user", "procurement_staff", "finance_staff", "head_procurement", "deputy_secretary", "deputy_finance", "dean", "head_office", "admin"]);
  if (!roles.has(role) || !/^[0-9a-f-]{36}$/i.test(userId)) return { error: "ข้อมูลผู้ใช้หรือบทบาทไม่ถูกต้อง" };
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.rpc("set_user_role", { target_user_id: userId, new_role: role, new_department_id: departmentId || null });
    if (error) return { error: error.message };
    revalidatePath("/settings");
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "เปลี่ยนบทบาทไม่สำเร็จ" };
  }
}

export async function createDepartment(code: string, name: string) {
  if (!/^[A-Za-z0-9_-]{2,20}$/.test(code.trim()) || name.trim().length < 2) return { error: "รหัสหรือชื่อหน่วยงานไม่ถูกต้อง" };
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.from("departments").insert({ code: code.trim().toUpperCase(), name_th: name.trim() });
    if (error) return { error: error.message };
    revalidatePath("/settings");
    return { error: null };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "เพิ่มหน่วยงานไม่สำเร็จ" };
  }
}
