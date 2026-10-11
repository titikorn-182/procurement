import { createClient } from "@/lib/supabase/server";
import { parseListFilters } from "@/lib/pagination";
import { requestListStatuses } from "@/features/requests/list-model";
import { getRequestPage } from "@/features/requests/server/list-queries";
import { buildRequestCsv, EXPORT_BATCH_SIZE } from "@/features/requests/export";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const headers = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return new Response("กรุณาเข้าสู่ระบบใหม่ก่อนส่งออก", { status: 401, headers });
  const filters = parseListFilters(
    Object.fromEntries(new URL(request.url).searchParams),
    Object.keys(requestListStatuses),
  );
  try {
    const csv = await buildRequestCsv((page) => {
      if (request.signal.aborted) throw new Error("ยกเลิกการส่งออกแล้ว");
      return getRequestPage({ ...filters, page }, EXPORT_BATCH_SIZE);
    });
    return new Response(csv, {
      headers: {
        ...headers,
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="procurement-requests-${new Date().toISOString().slice(0, 10)}.csv"`,
      },
    });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : "ส่งออกไม่สำเร็จ กรุณาลองใหม่", {
      status: 400,
      headers,
    });
  }
}
