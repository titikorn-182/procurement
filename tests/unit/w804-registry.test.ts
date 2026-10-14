import { beforeEach, describe, expect, it, vi } from "vitest";
import { createW804Fixture } from "../fixtures/w804";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), profile: vi.fn(), rpc: vi.fn(), from: vi.fn() }));
vi.mock("../../lib/supabase/server", () => ({
  createClient: async () => ({ auth: { getUser: mocks.auth }, from: mocks.from, rpc: mocks.rpc }),
}));
vi.mock("../../lib/server/action-errors", () => ({ toSafeActionError: () => "Safe failure" }));
import { saveW804Draft } from "../../features/w804/server/save";
const identity = {
  id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  request_no: "W804-001",
  revision: 1,
};
const input = () => ({ id: identity.id, revision: 0, data: createW804Fixture() });
beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "user", active: true }, error: null });
  mocks.from.mockImplementation(() => ({
    select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }),
  }));
  mocks.rpc.mockResolvedValue({ data: [identity], error: null });
});
describe("W804 save boundary", () => {
  it("uses the database number and revision; ignores forged form identity", async () => {
    const value = input();
    const result = await saveW804Draft({
      ...value,
      data: { ...value.data, request_no: "W804-999" },
    });
    expect(result).toEqual({
      ok: true,
      record: { id: identity.id, requestNo: "W804-001", revision: 1 },
    });
    expect(mocks.rpc).toHaveBeenCalledWith("save_w804_document_set", {
      record_id: identity.id,
      expected_revision: 0,
      draft_data: value.data,
    });
  });
  it.each(["admin", "user"])("allows active %s", async (role) => {
    mocks.profile.mockResolvedValue({ data: { role, active: true }, error: null });
    expect((await saveW804Draft(input())).ok).toBe(true);
  });
  it.each([{ role: "dean", active: true }, { role: "user", active: false }, null])(
    "rejects profile %j before RPC",
    async (profile) => {
      mocks.profile.mockResolvedValue({ data: profile, error: null });
      expect((await saveW804Draft(input())).ok).toBe(false);
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );
  it("requires authentication", async () => {
    mocks.auth.mockResolvedValue({ data: { user: null }, error: null });
    expect((await saveW804Draft(input())).ok).toBe(false);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rejects malformed UUID, revision, blank title and excess amount before database access", async () => {
    const value = input();
    for (const bad of [
      { ...value, id: "bad" },
      { ...value, revision: -1 },
      { ...value, data: { ...value.data, title: " " } },
      {
        ...value,
        data: { ...value.data, items: [{ ...value.data.items[0], quantity: 1, unitPrice: 50001 }] },
      },
    ]) {
      expect((await saveW804Draft(bad)).ok).toBe(false);
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("reports a conflict without retrying or overwriting", async () => {
    mocks.rpc.mockResolvedValue({ error: { code: "40001" } });
    expect(await saveW804Draft(input())).toMatchObject({
      ok: false,
      error: expect.stringContaining("อีกหน้าต่าง"),
    });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it("returns a permission message for an inaccessible record", async () => {
    mocks.rpc.mockResolvedValue({ error: { code: "42501" } });
    expect(await saveW804Draft(input())).toMatchObject({
      ok: false,
      error: expect.stringContaining("ไม่มีสิทธิ์"),
    });
  });
  it.each([
    { data: [] },
    { data: [{ ...identity, request_no: "POL01-001" }] },
    { error: { message: "secret detail" } },
  ])("fails closed without leaking database errors", async (response) => {
    mocks.rpc.mockResolvedValue(response);
    expect(await saveW804Draft(input())).toEqual({ ok: false, error: "Safe failure" });
  });
});
