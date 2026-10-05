"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { toSafeActionError } from "@/lib/server/action-errors";
import { isSettingKey, settingSchemas, userSettingsUpdateSchema } from "./schemas";

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

export async function updateUserSettings(
  userId: string,
  fullName: string,
  positionTitle: string,
  role: string,
  departmentId: string,
) {
  const parsed = userSettingsUpdateSchema.safeParse({
    userId,
    fullName,
    positionTitle,
    role,
    departmentId,
  });
  if (!parsed.success) {
    return { error: "กรุณาระบุชื่อ-นามสกุลอย่างน้อย 2 ตัวอักษร และตรวจสอบข้อมูลอีกครั้ง" };
  }
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase.rpc("update_user_admin_settings", {
      target_user_id: parsed.data.userId,
      new_full_name: parsed.data.fullName,
      new_position_title: parsed.data.positionTitle,
      new_role: parsed.data.role,
      new_department_id: parsed.data.departmentId || null,
    });
    if (error) {
      return {
        error: toSafeActionError("update-user-settings", error, "บันทึกข้อมูลผู้ใช้ไม่สำเร็จ"),
      };
    }
    revalidatePath("/settings");
    return { error: null };
  } catch (error) {
    return {
      error:
        error instanceof AccessError
          ? error.message
          : toSafeActionError("update-user-settings", error, "บันทึกข้อมูลผู้ใช้ไม่สำเร็จ"),
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
