"use client";
import { createClient } from "@/lib/supabase/client";

/** Session-visible profile only; never returns the Supabase session or token. */
export async function getShellProfile() {
  const supabase = createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) return null;
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", data.user.id)
    .maybeSingle();
  const role = profile?.role;
  const executiveRoles = [
    "head_procurement",
    "deputy_secretary",
    "deputy_finance",
    "dean",
    "head_office",
  ];
  return {
    name: profile?.full_name || data.user.email || "ผู้ใช้งาน",
    roleLabel:
      role === "admin"
        ? "ผู้ดูแลระบบ"
        : role === "user"
          ? "ผู้ยื่นคำขอ"
          : executiveRoles.includes(role ?? "")
            ? "ผู้บริหาร"
            : role === "procurement_staff" || role === "finance_staff"
              ? "เจ้าหน้าที่"
              : "ไม่พบสิทธิ์ใช้งาน",
  };
}
