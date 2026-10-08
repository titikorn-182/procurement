import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: vi.fn(),
  rpc: vi.fn(),
  safeError: vi.fn(),
}));
vi.mock("../../lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
    rpc: mocks.rpc,
  }),
}));
vi.mock("../../lib/server/action-errors", () => ({ toSafeActionError: mocks.safeError }));

import { canManageVendorDirectory, createVendor } from "../../app/requests/new/vendor-actions";
import { vendorNameSchema } from "../../app/requests/new/vendor-schema";

const vendor = {
  id: "11111111-1111-4111-8111-111111111111",
  display_name: "ร้านตัวอย่างทดสอบ",
  created: true,
};
beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "test-admin" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { role: "admin", active: true }, error: null });
  mocks.rpc.mockResolvedValue({ data: [vendor], error: null });
  mocks.safeError.mockReturnValue("บันทึกไม่สำเร็จ (รหัสอ้างอิง TEST)");
});

describe("admin vendor directory", () => {
  it("allows active admins and sends only the trimmed name to the restricted RPC", async () => {
    expect(await canManageVendorDirectory()).toBe(true);
    expect(await createVendor(`  ${vendor.display_name}  `)).toEqual({
      vendor: { id: vendor.id, name: vendor.display_name },
      created: true,
      error: null,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("admin_create_vendor", {
      vendor_name: vendor.display_name,
    });
  });

  it.each(["user", "procurement_staff", "finance_staff", "head_procurement", "dean"])(
    "rejects %s even if the UI is bypassed",
    async (role) => {
      mocks.profile.mockResolvedValue({ data: { role, active: true }, error: null });
      expect(await canManageVendorDirectory()).toBe(false);
      expect((await createVendor(vendor.display_name)).vendor).toBeNull();
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );

  it("rejects inactive admins and missing profiles", async () => {
    for (const data of [{ role: "admin", active: false }, null]) {
      mocks.profile.mockResolvedValue({ data, error: null });
      expect(await canManageVendorDirectory()).toBe(false);
      expect((await createVendor(vendor.display_name)).error).toContain("เฉพาะผู้ดูแลระบบ");
    }
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("fails closed on session and profile errors", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: null });
    expect(await canManageVendorDirectory()).toBe(false);
    expect((await createVendor(vendor.display_name)).vendor).toBeNull();
    expect(mocks.profile).not.toHaveBeenCalled();
    mocks.getUser.mockResolvedValue({ data: { user: { id: "test" } }, error: null });
    mocks.profile.mockResolvedValue({
      data: { role: "admin", active: true },
      error: { message: "private" },
    });
    expect((await createVendor(vendor.display_name)).vendor).toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it.each([null, {}, "", "  ", "ก", "--", "ชื่อ\u0000ร้าน", "ก".repeat(201)])(
    "rejects invalid name %j before the write",
    async (input) => {
      expect(vendorNameSchema.safeParse(input).success).toBe(false);
      expect((await createVendor(input)).vendor).toBeNull();
      expect(mocks.rpc).not.toHaveBeenCalled();
    },
  );

  it("reuses duplicate names returned by the database without another write", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ ...vendor, created: false }], error: null });
    expect(await createVendor(vendor.display_name)).toMatchObject({
      created: false,
      error: null,
      vendor: { id: vendor.id },
    });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["42501", "สิทธิ์"],
    ["22023", "2–200"],
    ["55000", "ถูกปิดใช้งาน"],
    ["PGRST202", "migration"],
    ["42883", "migration"],
  ])("handles %s without exposing database details", async (code, message) => {
    mocks.rpc.mockResolvedValue({ data: null, error: { code, message: "private details" } });
    const result = await createVendor(vendor.display_name);
    expect(result.error).toContain(message);
    expect(result.error).not.toContain("private details");
    expect(result.vendor).toBeNull();
  });

  it("does not claim success for a malformed RPC response", async () => {
    mocks.rpc.mockResolvedValue({ data: [{ ...vendor, id: "bad-id" }], error: null });
    expect((await createVendor(vendor.display_name)).error).toContain("ค้นหาชื่อนี้ก่อน");
  });

  it("rechecks authorization after permission was previously granted", async () => {
    expect(await canManageVendorDirectory()).toBe(true);
    mocks.profile.mockResolvedValue({ data: { role: "user", active: true }, error: null });
    expect((await createVendor(vendor.display_name)).vendor).toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
