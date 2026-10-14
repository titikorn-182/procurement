import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  rpc: vi.fn(),
  from: vi.fn(),
  eq: vi.fn(),
  maybeSingle: vi.fn(),
  getUser: vi.fn(),
}));
vi.mock("../../lib/supabase/server", () => ({
  createClient: async () => ({
    rpc: mocks.rpc,
    from: mocks.from,
    auth: { getUser: mocks.getUser },
  }),
}));
import {
  getRequestDetail,
  getReturnedRequestForEdit,
} from "../../features/requests/server/queries";
const id = "11111111-1111-4111-8111-111111111111";
beforeEach(() => {
  vi.resetAllMocks();
  const query = {
    select: vi.fn(),
    eq: mocks.eq,
    in: vi.fn(),
    order: vi.fn(),
    maybeSingle: mocks.maybeSingle,
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.in.mockReturnValue(query);
  query.order.mockReturnValue(query);
  mocks.from.mockReturnValue(query);
  mocks.rpc.mockResolvedValue({
    data: [{ request_id: id, request_no: "W119-001", previous_request_nos: ["POL01-017"] }],
    error: null,
  });
  mocks.maybeSingle.mockResolvedValue({ data: { id, request_no: "W119-001" }, error: null });
  mocks.getUser.mockResolvedValue({ data: { user: { id: "owner" } } });
});
describe("request number identity", () => {
  it.each(["POL01-017", "W119-001"])(
    "resolves %s to the same record for detail/print with historical references",
    async (number) => {
      const result = await getRequestDetail(number);
      expect(mocks.rpc).toHaveBeenCalledWith("resolve_procurement_request_number", {
        lookup_no: number,
      });
      expect(mocks.eq).toHaveBeenCalledWith("id", id);
      expect(result.data).toMatchObject({
        id,
        request_no: "W119-001",
        previousRequestNos: ["POL01-017"],
      });
    },
  );
  it("does not query details for an inaccessible or missing identity", async () => {
    mocks.rpc.mockResolvedValue({ data: [], error: null });
    expect(await getRequestDetail("POL01-019")).toEqual({ data: null, error: null });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("fails closed when the identity lookup fails", async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: "XX000", message: "Synthetic failure" },
    });
    const result = await getRequestDetail("POL01-017");
    expect(result.data).toBeNull();
    expect(result.error).toContain("ไม่สามารถโหลดรายละเอียดคำขอได้");
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("retains owner and editable-state checks for old edit links", async () => {
    mocks.maybeSingle.mockResolvedValue({ data: null, error: null });
    await getReturnedRequestForEdit("POL01-017");
    expect(mocks.eq).toHaveBeenCalledWith("id", id);
    expect(mocks.eq).toHaveBeenCalledWith("requester_id", "owner");
    expect(mocks.from.mock.results[0].value.in).toHaveBeenCalledWith("status", [
      "returned",
      "draft",
    ]);
  });
});
