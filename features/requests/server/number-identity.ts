import "server-only";
import type { createClient } from "@/lib/supabase/server";

// Resolve with the caller's RLS, then use UUIDs without rewriting workflow references.
export async function resolveRequestNumber(
  client: Awaited<ReturnType<typeof createClient>>,
  requestNo: string,
) {
  const { data, error } = await client.rpc("resolve_procurement_request_number", {
    lookup_no: requestNo,
  });
  if (error) return { identity: null, error };
  return { identity: data?.[0] ?? null, error: null };
}
