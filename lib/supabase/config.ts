function requirePublicEnv(name: "NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Supabase is not configured. Missing ${name}.`);
  }
  return value;
}

const supabaseUrl = requirePublicEnv("NEXT_PUBLIC_SUPABASE_URL");
const supabaseAnonKey = requirePublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

export { supabaseAnonKey, supabaseUrl };
