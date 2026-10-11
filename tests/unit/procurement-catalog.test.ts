import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  addCatalogItem,
  catalogDataSchema,
  catalogItemSnapshot,
  catalogPriceWarning,
  catalogQuerySchema,
  type CatalogEntry,
} from "../../app/requests/new/catalog-schema";
import { emptyPol01Item, pol01ItemsPayload } from "../../app/requests/new/item-input";

const mocks = vi.hoisted(() => ({ getUser: vi.fn(), profile: vi.fn(), rpc: vi.fn() }));
vi.mock("../../lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
    rpc: mocks.rpc,
  }),
}));
vi.mock("../../lib/server/action-errors", () => ({
  toSafeActionError: (_scope: string, _error: unknown, message: string) => message,
}));
import { searchProcurementCatalog } from "../../app/requests/new/catalog-actions";

// Synthetic fixture, not operational master data or a real vendor directory.
const entry: CatalogEntry = {
  item_id: "11111111-1111-4111-8111-111111111111",
  price_id: "22222222-2222-4222-8222-222222222222",
  import_id: "33333333-3333-4333-8333-333333333333",
  origin: "excel",
  version: 1,
  active: true,
  image_path: null,
  item_code: "TEST-001-01",
  category_code: "TEST",
  category_name: "หมวดทดสอบ",
  subcategory: "กระดาษ",
  name: "รายการทดสอบ",
  specification: "80 แกรม",
  unit: "รีม",
  notes: "ข้อมูลทดสอบ",
  reference_price: 119,
  source_name: "แหล่งข้อมูลทดสอบ",
  reference_date: null,
  valid_until: null,
  status: "unverified",
  expired: false,
  sheet_name: "Master",
  row_number: 2,
  file_name: "test.xlsx",
};
const data = { items: [entry], total: 1, categories: [{ code: "TEST", name: "หมวดทดสอบ" }] };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: "test" } }, error: null });
  mocks.profile.mockResolvedValue({ data: { active: true }, error: null });
  mocks.rpc.mockResolvedValue({ data, error: null });
});

describe("catalog reference snapshots", () => {
  it("fills reference data but never invents quantity or purchase price", () => {
    const item = catalogItemSnapshot(entry)!;
    expect(item).toMatchObject({
      description: "รายการทดสอบ — 80 แกรม",
      unit: "รีม",
      marketPrice: 119,
      quantity: null,
      unitPrice: null,
    });
    expect(item.priceSource).toContain(entry.price_id);
    expect(item.priceSource).toContain("ไม่ระบุวันที่ราคา | ยังไม่รับรอง");
    expect(catalogPriceWarning(entry)).toBe("ยังไม่ยืนยันวันที่และการรับรอง");
    expect(pol01ItemsPayload([item])).toBeNull();
    const payload = pol01ItemsPayload([{ ...item, quantity: 2, unitPrice: 110 }]);
    expect(payload?.[0]).toMatchObject({
      market_price: 119,
      unit_price: 110,
      price_source: item.priceSource,
    });
  });
  it("uses first genuinely blank row without overwriting partially filled or zero fields", () => {
    for (const partial of [
      { description: "เก็บไว้" },
      { quantity: 3 },
      { unit: "อัน" },
      { unitPrice: 0 },
      { marketPrice: 0 },
      { priceSource: "หลักฐานเดิม" },
    ]) {
      const original = { ...emptyPol01Item(), ...partial };
      const items = [original, emptyPol01Item()];
      const next = addCatalogItem(items, entry)!;
      expect(next[0]).toBe(original);
      expect(next[1].marketPrice).toBe(119);
      expect(items[1]).toEqual(emptyPol01Item());
      expect(addCatalogItem([original], entry)).toHaveLength(2);
    }
  });
  it("limits 200 rows but still reuses a blank slot at capacity", () => {
    const items = Array.from({ length: 200 }, () => ({ ...emptyPol01Item(), description: "keep" }));
    expect(addCatalogItem(items, entry)).toBeNull();
    items[199] = emptyPol01Item();
    expect(addCatalogItem(items, entry)).toHaveLength(200);
  });
  it("rejects expired and overlong snapshots rather than truncating provenance", () => {
    expect(catalogItemSnapshot({ ...entry, expired: true })).toBeNull();
    expect(catalogItemSnapshot({ ...entry, specification: "x".repeat(501) })).toBeNull();
    expect(catalogItemSnapshot({ ...entry, source_name: "x".repeat(501) })).toBeNull();
  });
  it("accepts explicit zero but rejects null or malformed prices from the database", () => {
    expect(
      catalogDataSchema.safeParse({ ...data, items: [{ ...entry, reference_price: 0 }] }).success,
    ).toBe(true);
    for (const reference_price of [null, -1, Infinity, "119", NaN]) {
      expect(
        catalogDataSchema.safeParse({ ...data, items: [{ ...entry, reference_price }] }).success,
      ).toBe(false);
    }
    expect(catalogItemSnapshot({ ...entry, status: "withdrawn" })).toBeNull();
  });
});

describe("catalog server authorization / no mock fallback", () => {
  it("checks session and active profile, sends bounded filters to the protected RPC", async () => {
    expect(await searchProcurementCatalog({ query: " A4 ", category: "TEST", page: 2 })).toEqual({
      data,
      error: null,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("search_procurement_catalog", {
      catalog_query: "A4",
      category_filter: "TEST",
      page_number: 2,
    });
  });
  it.each([
    null,
    {},
    { query: "x".repeat(121), category: "", page: 0 },
    { query: "", category: "", page: -1 },
    { query: "", category: "", page: 1.5 },
  ])("rejects invalid search %j", async (input) => {
    expect(catalogQuerySchema.safeParse(input).success).toBe(false);
    expect((await searchProcurementCatalog(input)).data).toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("fails closed on invalid session and inactive/missing/failed profile", async () => {
    const input = { query: "", category: "", page: 0 };
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect((await searchProcurementCatalog(input)).data).toBeNull();
    mocks.getUser.mockResolvedValueOnce({
      data: { user: { id: "test" } },
      error: { message: "bad JWT" },
    });
    expect((await searchProcurementCatalog(input)).data).toBeNull();
    for (const profile of [null, { active: false }]) {
      mocks.profile.mockResolvedValueOnce({ data: profile, error: null });
      expect((await searchProcurementCatalog(input)).data).toBeNull();
    }
    mocks.profile.mockResolvedValueOnce({ data: { active: true }, error: { message: "RLS" } });
    expect((await searchProcurementCatalog(input)).data).toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("does not substitute workbook/mock records when RPC or transport fails", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "schema not found" } });
    const input = { query: "", category: "", page: 0 };
    expect(await searchProcurementCatalog(input)).toMatchObject({
      data: null,
      error: expect.stringContaining("migration"),
    });
    mocks.rpc.mockRejectedValueOnce(new Error("Network"));
    expect(await searchProcurementCatalog(input)).toMatchObject({
      data: null,
      error: expect.stringContaining("เชื่อมต่อ"),
    });
  });
  it("distinguishes empty import from invalid returned data", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { items: [], total: 0, categories: [] }, error: null });
    expect((await searchProcurementCatalog({ query: "", category: "", page: 0 })).error).toBeNull();
    mocks.rpc.mockResolvedValueOnce({
      data: { items: [{ ...entry, reference_price: null }] },
      error: null,
    });
    expect((await searchProcurementCatalog({ query: "", category: "", page: 0 })).data).toBeNull();
  });
});
