import "server-only";
import { createClient } from "@/lib/supabase/server";

/** A rendering hint only. Mutations must independently check their own permissions. */
export async function canPrepareProcurementDocuments() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  const { data: profile, error: profileError } =
    user && !error
      ? await supabase.from("profiles").select("role, active").eq("id", user.id).maybeSingle()
      : { data: null, error: null };
  return (
    !error && !profileError && profile?.active === true && ["admin", "user"].includes(profile.role)
  );
}

export async function isSignedIn() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return Boolean(user);
}
