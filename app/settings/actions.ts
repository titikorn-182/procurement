"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toSafeActionError } from "@/lib/server/action-errors";
import { isSettingKey, settingSchemas } from "./schemas";

const appRoleSchema = z.enum([
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

class AccessError extends Error {}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new AccessError("กรุณาเข้าสู่ระบบใหม่");
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", user.id)
    .single();
  if (!profile?.active || profile.role !== "admin")
    throw new AccessError("เฉพาะผู้ดูแลระบบเท่านั้นที่แก้ไขการตั้งค่าได้");
  return { supabase, user };
}

export async function saveSystemSetting(key: string, value: Record<string, unknown>) {
  if (!isSettingKey(key)) return { error: "ไม่พบหมวดการตั้งค่าที่ระบุ" };
  const parsedValue = settingSchemas[key].safeParse(value);
  if (!parsedValue.success) return { error: "ข้อมูลการตั้งค่าไม่ถูกต้องหรือไม่ครบถ้วน" };
  try {
    const { supabase, user } = await requireAdmin();
    const { error } = await supabase.from("system_settings").upsert({
      key,
      value: parsedValue.data,
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    });
    if (error) {
      return {
        error: toSafeActionError("save-system-setting", error, "บันทึกการตั้งค่าไม่สำเร็จ"),
      };
    }
    revalidatePath("/settings");
    return { error: null };
  } catch (error) {
    return {
      error:
        error instanceof AccessError
          ? error.message
          : toSafeActionError("save-system-setting", error, "บันทึกการตั้งค่าไม่สำเร็จ"),
    };
  }
}

export async function updateUserRole(userId: string, role: string, departmentId: string) {
  const parsed = z
    .object({
      userId: z.string().uuid(),
      role: appRoleSchema,
      departmentId: z.union([z.literal(""), z.string().uuid()]),
    })
    .safeParse({ userId, role, departmentId });
  if (!parsed.success) return { error: "ข้อมูลผู้ใช้หรือบทบาทไม่ถูกต้อง" };
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.rpc("set_user_role", {
      target_user_id: parsed.data.userId,
      new_role: parsed.data.role,
      new_department_id: parsed.data.departmentId || null,
    });
    if (error) {
      return { error: toSafeActionError("update-user-role", error, "เปลี่ยนบทบาทไม่สำเร็จ") };
    }
    revalidatePath("/settings");
    return { error: null };
  } catch (error) {
    return {
      error:
        error instanceof AccessError
          ? error.message
          : toSafeActionError("update-user-role", error, "เปลี่ยนบทบาทไม่สำเร็จ"),
    };
  }
}

export async function createDepartment(code: string, name: string) {
  const parsed = z
    .object({
      code: z
        .string()
        .trim()
        .min(2)
        .max(20)
        .regex(/^[A-Za-z0-9_-]+$/),
      name: z.string().trim().min(2).max(200),
    })
    .safeParse({ code, name });
  if (!parsed.success) return { error: "รหัสหรือชื่อหน่วยงานไม่ถูกต้อง" };
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("departments")
      .insert({ code: parsed.data.code.toUpperCase(), name_th: parsed.data.name });
    if (error) {
      return { error: toSafeActionError("create-department", error, "เพิ่มหน่วยงานไม่สำเร็จ") };
    }
    revalidatePath("/settings");
    return { error: null };
  } catch (error) {
    return {
      error:
        error instanceof AccessError
          ? error.message
          : toSafeActionError("create-department", error, "เพิ่มหน่วยงานไม่สำเร็จ"),
    };
  }
}
