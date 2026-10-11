import { beforeEach, describe, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({
  user: vi.fn(),
  profile: vi.fn(),
  rpc: vi.fn(),
  departments: vi.fn(),
  settings: vi.fn(),
  from: vi.fn(),
}));
vi.mock("../../lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mock.user },
    rpc: mock.rpc,
    from: mock.from,
  }),
}));
import { getSettingsWorkspace } from "../../features/settings/server/queries";
import { canPrepareProcurementDocuments, isSignedIn } from "../../features/auth/server/queries";
beforeEach(() => {
  vi.resetAllMocks();
  mock.user.mockResolvedValue({ data: { user: { id: "owner" } }, error: null });
  mock.profile.mockResolvedValue({ data: { role: "admin", active: true }, error: null });
  mock.rpc.mockResolvedValue({ data: [{ id: "synthetic" }], error: null });
  mock.departments.mockResolvedValue({ data: [], error: null });
  mock.settings.mockResolvedValue({ data: [], error: null });
  mock.from.mockImplementation((table: string) => {
    if (table === "system_settings") return { select: mock.settings };
    if (table === "departments") return { select: () => ({ order: mock.departments }) };
    const q = { select: () => q, eq: () => q, maybeSingle: mock.profile };
    return q;
  });
});
describe("settings DAL authorization", () => {
  it.each([{ role: "user", active: true }, { role: "admin", active: false }, null])(
    "denies %j before reading admin data",
    async (data) => {
      mock.profile.mockResolvedValue({ data, error: null });
      expect(await getSettingsWorkspace()).toEqual({ allowed: false });
      expect(mock.rpc).not.toHaveBeenCalled();
      expect(mock.settings).not.toHaveBeenCalled();
    },
  );
  it("blocks expired sessions before profile or administrative reads", async () => {
    mock.user.mockResolvedValue({ data: { user: null }, error: null });
    expect(await getSettingsWorkspace()).toEqual({ allowed: false });
    expect(mock.from).not.toHaveBeenCalled();
    expect(await isSignedIn()).toBe(false);
  });
  it("returns only workspace data and safe errors for an active administrator", async () => {
    mock.rpc.mockResolvedValue({ data: null, error: { message: "private SQL" } });
    mock.settings.mockResolvedValue({ data: null, error: { message: "private SQL" } });
    const result = await getSettingsWorkspace();
    expect(result).toMatchObject({ allowed: true, profiles: [], databaseReady: false });
    expect(JSON.stringify(result)).not.toContain("private SQL");
    expect(result).not.toHaveProperty("user");
  });
});
describe("document preparation access hints", () => {
  it.each(["admin", "user"])("allows active %s", async (role) => {
    mock.profile.mockResolvedValue({ data: { role, active: true }, error: null });
    expect(await canPrepareProcurementDocuments()).toBe(true);
  });
  it.each(["procurement_staff", "finance_staff", "dean"])(
    "preserves denial for %s",
    async (role) => {
      mock.profile.mockResolvedValue({ data: { role, active: true }, error: null });
      expect(await canPrepareProcurementDocuments()).toBe(false);
    },
  );
  it("fails closed on profile read errors even if data exists", async () => {
    mock.profile.mockResolvedValue({
      data: { role: "admin", active: true },
      error: { message: "network" },
    });
    expect(await canPrepareProcurementDocuments()).toBe(false);
    expect(await getSettingsWorkspace()).toEqual({ allowed: false });
  });
});
