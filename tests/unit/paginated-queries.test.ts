import { beforeEach, describe, expect, it, vi } from "vitest";
const { fetchMock } = vi.hoisted(() => ({ fetchMock: vi.fn<typeof fetch>() }));
vi.mock("@/lib/supabase/server", async () => {
  const { createClient } = await import("@supabase/supabase-js");
  return {
    createClient: async () =>
      createClient("http://localhost:54329", "synthetic-test-key", {
        global: { fetch: fetchMock },
        auth: { persistSession: false, autoRefreshToken: false },
      }),
  };
});
vi.mock("@/lib/server/action-errors", () => ({
  toSafeActionError: (_scope: string, _error: unknown, message: string) => message,
}));
import { getRequestPage } from "@/features/requests/server/list-queries";
import { getPaymentPage } from "@/features/payments/server/list-queries";

const request = {
  id: "id",
  request_no: "PR/1001",
  kind: "hire",
  title: "Old record",
  estimated_amount: 100,
  budget_year: 2570,
  status: "returned",
  current_step: 2,
  created_at: "2026-01-01T18:00:00Z",
  required_date: null,
  department_name: "Unit",
  requester_name: "Owner",
  list_status: "overdue",
  search_text: "Old record",
};
beforeEach(() => fetchMock.mockReset());
describe("paginated data-access queries", () => {
  it("filters before range with exact authorized count and stable ordering", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([request]), {
        headers: { "Content-Type": "application/json", "Content-Range": "1000-1000/1001" },
      }),
    );
    const result = await getRequestPage({
      q: "100%_*",
      status: "overdue",
      kind: "hire",
      page: 101,
    });
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toBe("/rest/v1/procurement_request_list");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      offset: "1000",
      limit: "10",
      order: "created_at.desc,id.desc",
      search_text: "imatch.100%_\\*",
      list_status: "eq.overdue",
      kind: "eq.hire",
    });
    expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get("Prefer")).toContain("count=exact");
    expect(result.total).toBe(1001);
    expect(result.rows[0]).toMatchObject({
      id: "PR/1001",
      status: "เกินกำหนด",
      type: "จ้าง",
      amount: 100,
    });
  });
  it("queries payment relationship search and status without downloading all rows", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify([
          {
            id: "id",
            payment_no: "PV",
            total_amount: 42,
            status: "returned",
            current_step: 3,
            created_at: "2026-01-01",
            subject: "Test",
            requester_name: "Owner",
            department_name: "Unit",
            source_no: "PR",
          },
        ]),
        { headers: { "Content-Range": "10-10/11" } },
      ),
    );
    const result = await getPaymentPage({ q: "Owner", status: "returned", kind: "all", page: 2 });
    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.pathname).toBe("/rest/v1/payment_request_list");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({
      offset: "10",
      limit: "10",
      status: "eq.returned",
      search_text: "imatch.Owner",
    });
    expect(result.rows[0]).toMatchObject({
      paymentNo: "PV",
      requester: "Owner",
      sourceNo: "PR",
      amount: 42,
    });
  });
  it("reports missing migrations as a load error, not an empty successful list", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ code: "PGRST205", message: "missing relation" }), {
        status: 404,
      }),
    );
    const result = await getRequestPage({ q: "", status: "all", kind: "all", page: 1 });
    expect(result.error).toContain("โหลดรายการคำขอไม่สำเร็จ");
    expect(result.rows).toEqual([]);
  });
});
