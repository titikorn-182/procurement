"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSafeInternalRedirect } from "@/lib/auth/safe-redirect";

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = getSafeInternalRedirect(formData.get("next"));
  if (!email || !password) redirect("/login?error=กรุณากรอกอีเมลและรหัสผ่าน");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/login?error=${encodeURIComponent("อีเมลหรือรหัสผ่านไม่ถูกต้อง")}`);
  redirect(next);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
