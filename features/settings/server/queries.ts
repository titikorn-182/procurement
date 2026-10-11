import "server-only";
import { createClient } from "@/lib/supabase/server";
export async function getSettingsWorkspace() {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  const { data: profile, error: profileError } =
    user && !authError
      ? await supabase.from("profiles").select("role, active").eq("id", user.id).maybeSingle()
      : { data: null, error: null };

  if (authError || profileError || profile?.role !== "admin" || profile.active !== true)
    return { allowed: false as const };
  const [
    { data: profiles, error: profilesError },
    { data: departments },
    { data: settings, error: settingsError },
  ] = await Promise.all([
    supabase.rpc("admin_list_user_profiles"),
    supabase.from("departments").select("id, code, name_th, active").order("code"),
    supabase.from("system_settings").select("key, value, updated_at"),
  ]);

  return {
    allowed: true as const,
    profiles: profiles ?? [],
    departments: departments ?? [],
    settings: settings ?? [],
    databaseReady: !settingsError,
    profilesError: profilesError
      ? "ไม่สามารถโหลดชื่อ E-mail และตำแหน่งของผู้ใช้ได้ กรุณาตรวจสอบ migration แล้วโหลดหน้าอีกครั้ง"
      : null,
  };
}
