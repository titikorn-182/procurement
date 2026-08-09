function requirePublicEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Supabase is not configured. Missing ${name}.`);
  }
  return value;
}

// NEXT_PUBLIC values must be referenced statically so Next.js can inline them
// into browser bundles. Dynamic access such as process.env[name] is unsupported.
const supabaseUrl = requirePublicEnv(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  "NEXT_PUBLIC_SUPABASE_URL",
);
const supabaseAnonKey = requirePublicEnv(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
);

export { supabaseAnonKey, supabaseUrl };
