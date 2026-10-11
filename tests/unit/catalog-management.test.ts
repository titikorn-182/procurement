import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  catalogSaveSchema,
  CATALOG_IMAGE_MAX_BYTES,
  type CatalogSaveInput,
} from "../../app/catalog/schema";
import {
  catalogDataSchema,
  catalogItemSnapshot,
  type CatalogEntry,
} from "../../app/requests/new/catalog-schema";
import { validateCatalogImage } from "../../app/catalog/image-validation";

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  profile: vi.fn(),
  rpc: vi.fn(),
  upload: vi.fn(),
  download: vi.fn(),
  revalidate: vi.fn(),
}));
vi.mock("../../lib/supabase/server", () => ({
  createClient: async () => ({
    auth: { getUser: mocks.getUser },
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: mocks.profile }) }) }),
    rpc: mocks.rpc,
    storage: { from: () => ({ upload: mocks.upload, download: mocks.download }) },
  }),
}));
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidate }));
vi.mock("../../lib/server/action-errors", () => ({
  toSafeActionError: (_scope: string, _error: unknown, fallback: string) => fallback,
}));
import {
  getCatalogAccess,
  searchCatalogManagement,
  saveCatalogItem,
  uploadCatalogImage,
} from "../../app/catalog/actions";
import { GET as imageRoute } from "../../app/api/catalog-images/[id]/route";

const itemId = "11111111-1111-4111-8111-111111111111";
const userId = "22222222-2222-4222-8222-222222222222";
const priceId = "33333333-3333-4333-8333-333333333333";
const path = `items/${itemId}/${userId}/44444444-4444-4444-8444-444444444444.png`;
const price = {
  reference_price: 119,
  source_name: "แหล่งอ้างอิงทดสอบ",
  reference_date: null,
  valid_until: null,
};
const input: CatalogSaveInput = {
  item_id: itemId,
  expected_version: null,
  item_code: "TEST-001",
  category_code: "OFF",
  subcategory: "กระดาษ",
  name: "รายการทดสอบ",
  specification: "A4",
  unit: "รีม",
  notes: "",
  active: true,
  image_path: null,
  price,
};
const entry: CatalogEntry = {
  item_id: itemId,
  price_id: priceId,
  import_id: null,
  origin: "manual",
  version: 2,
  active: true,
  image_path: path,
  item_code: input.item_code,
  category_code: "OFF",
  category_name: "วัสดุสำนักงาน",
  subcategory: input.subcategory,
  name: input.name,
  specification: input.specification,
  unit: input.unit,
  notes: "",
  ...price,
  status: "unverified",
  expired: false,
  sheet_name: null,
  row_number: null,
  file_name: null,
};
const query = { query: "", category: "", page: 0 };
// Tiny valid PNG fixture. No operational data or uploaded user image is embedded here.
const png = () =>
  Uint8Array.from(
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a5b8AAAAASUVORK5CYII=",
      "base64",
    ),
  );
const uploadData = (bytes = png(), type = "image/png") => {
  const data = new FormData();
  data.set("itemId", itemId);
  data.set("file", new File([Uint8Array.from(bytes)], "display-name.png", { type }));
  return data;
};

beforeEach(() => {
  vi.resetAllMocks();
  mocks.getUser.mockResolvedValue({ data: { user: { id: userId } }, error: null });
  mocks.profile.mockResolvedValue({ data: { active: true, role: "admin" }, error: null });
  mocks.rpc.mockResolvedValue({ data: { item_id: itemId, version: 1 }, error: null });
  mocks.upload.mockResolvedValue({ data: { path }, error: null });
});

describe("catalog management input contract", () => {
  it("preserves explicit zero and distinguishes new price from metadata-only edits", () => {
    expect(catalogSaveSchema.safeParse(input).success).toBe(true);
    expect(
      catalogSaveSchema.safeParse({ ...input, price: { ...price, reference_price: 0 } }).success,
    ).toBe(true);
    expect(catalogSaveSchema.safeParse({ ...input, price: null }).success).toBe(false);
    expect(
      catalogSaveSchema.safeParse({ ...input, expected_version: 2, price: null }).success,
    ).toBe(true);
    expect(catalogSaveSchema.safeParse({ ...input, name: "   " }).success).toBe(false);
  });
  it("bounds text, dates, prices and the image path to this item", () => {
    for (const reference_price of [null, "119", -1, NaN, Infinity, 1.001, 1.00001, 1e12])
      expect(
        catalogSaveSchema.safeParse({ ...input, price: { ...price, reference_price } }).success,
      ).toBe(false);
    for (const change of [
      { notes: "x".repeat(2001) },
      { subcategory: "x".repeat(101) },
      { name: "unsafe\u0000" },
      { image_path: "https://outside.test/image.png" },
      { image_path: path.replace(itemId, priceId) },
      { image_path: `items/${itemId}/../image.svg` },
      { expected_version: 0 },
      { verified_by: userId },
    ])
      expect(catalogSaveSchema.safeParse({ ...input, ...change }).success).toBe(false);
    expect(catalogSaveSchema.safeParse({ ...input, image_path: path }).success).toBe(true);
    expect(
      catalogSaveSchema.safeParse({ ...input, price: { ...price, reference_date: "2026-02-30" } })
        .success,
    ).toBe(false);
    expect(
      catalogSaveSchema.safeParse({ ...input, price: { ...price, valid_until: "2026-10-11" } })
        .success,
    ).toBe(false);
    expect(
      catalogSaveSchema.safeParse({
        ...input,
        price: { ...price, reference_date: "2026-10-11", valid_until: "2026-10-10" },
      }).success,
    ).toBe(false);
  });
  it("manual sources never claim Excel provenance or certification", () => {
    const parsed = catalogDataSchema.parse({ items: [entry], total: 1, categories: [] });
    const snapshot = catalogItemSnapshot(parsed.items[0])!;
    expect(snapshot.priceSource).toContain("ผู้ดูแลระบบ:");
    expect(snapshot.priceSource).not.toContain("Excel");
    expect(snapshot.priceSource).toContain("ยังไม่รับรอง");
    expect(snapshot.quantity).toBeNull();
    expect(snapshot.unitPrice).toBeNull();
    expect(catalogItemSnapshot({ ...entry, active: false })).toBeNull();
    expect(catalogItemSnapshot({ ...entry, status: "withdrawn" })).toBeNull();
  });
  it("can parse earlier Excel responses using backward-compatible presentation defaults", () => {
    const legacy = {
      ...entry,
      import_id: priceId,
      sheet_name: "Master",
      row_number: 2,
      file_name: "fixture.xlsx",
    } as Record<string, unknown>;
    for (const key of ["origin", "version", "active", "image_path"]) delete legacy[key];
    expect(
      catalogDataSchema.parse({ items: [legacy], total: 1, categories: [] }).items[0],
    ).toMatchObject({ origin: "excel", version: 1, active: true, image_path: null });
  });
});

describe("server-side catalog image validation", () => {
  it("identifies actual PNG bytes and dimensions", () => {
    expect(validateCatalogImage(png(), "image/png")).toMatchObject({
      error: null,
      image: { contentType: "image/png", width: 1, height: 1, extension: "png" },
    });
  });
  it("rejects empty/oversize, SVG, MIME spoofing, truncation and trailing data", () => {
    for (const [bytes, type] of [
      [new Uint8Array(), "image/png"],
      [new Uint8Array(CATALOG_IMAGE_MAX_BYTES + 1), "image/png"],
      [new TextEncoder().encode("<svg onload='x()'></svg>"), "image/png"],
      [png(), "image/jpeg"],
      [png().slice(0, 30), "image/png"],
      [new Uint8Array([...png(), 0]), "image/png"],
    ] as const)
      expect(validateCatalogImage(bytes, type).image).toBeNull();
  });
  it("bounds dimension and pixel count before any decoding", () => {
    for (const [width, height] of [
      [0, 1],
      [6001, 1],
      [5000, 5000],
    ]) {
      const bytes = png();
      const view = new DataView(bytes.buffer);
      view.setUint32(16, width);
      view.setUint32(20, height);
      expect(validateCatalogImage(bytes, "image/png").error).toContain("พิกเซล");
    }
  });
  it("reads JPEG SOF dimensions, rejects missing end marker", () => {
    const jpeg = Uint8Array.from([255, 216, 255, 192, 0, 8, 8, 0, 20, 0, 30, 0, 255, 217]);
    expect(validateCatalogImage(jpeg, "image/jpeg").image).toMatchObject({
      width: 30,
      height: 20,
      extension: "jpg",
    });
    expect(validateCatalogImage(jpeg.slice(0, -2), "image/jpeg").image).toBeNull();
  });
  it("reads a lossless WebP header but rejects animation flags", () => {
    // Synthetic RIFF container exercises dimension parsing independently from image decoding.
    const bytes = new Uint8Array(30);
    bytes.set(new TextEncoder().encode("RIFF"));
    bytes.set(new TextEncoder().encode("WEBPVP8L"), 8);
    const view = new DataView(bytes.buffer);
    view.setUint32(4, 22, true);
    view.setUint32(16, 9, true);
    bytes[20] = 47;
    view.setUint32(21, (29 << 14) | 19, true);
    expect(validateCatalogImage(bytes, "image/webp").image).toMatchObject({
      width: 20,
      height: 30,
    });
    bytes.set(new TextEncoder().encode("ANIM"), 12);
    expect(validateCatalogImage(bytes, "image/webp").image).toBeNull();
  });
});

describe("catalog server authorization and save semantics", () => {
  it("exposes only a live profile-derived access hint", async () => {
    expect(await getCatalogAccess()).toEqual({ canRead: true, canManage: true, error: null });
    mocks.profile.mockResolvedValueOnce({ data: { active: true, role: "user" }, error: null });
    expect(await getCatalogAccess()).toEqual({ canRead: true, canManage: false, error: null });
    mocks.profile.mockResolvedValueOnce({ data: { active: false, role: "admin" }, error: null });
    expect((await getCatalogAccess()).canRead).toBe(false);
  });
  it.each(["user", "dean", "procurement_staff"])(
    "rejects writes and admin listings from %s",
    async (role) => {
      mocks.profile.mockResolvedValue({ data: { active: true, role }, error: null });
      expect((await saveCatalogItem(input)).data).toBeNull();
      expect((await uploadCatalogImage(uploadData())).path).toBeNull();
      expect((await searchCatalogManagement(query)).data).toBeNull();
      expect(mocks.rpc).not.toHaveBeenCalled();
      expect(mocks.upload).not.toHaveBeenCalled();
    },
  );
  it("rejects inactive, unauthenticated, failed-profile and malformed saves", async () => {
    for (const profile of [
      null,
      { active: false, role: "admin" },
      { active: true, role: "unknown" },
    ]) {
      mocks.profile.mockResolvedValueOnce({ data: profile, error: null });
      expect((await saveCatalogItem(input)).data).toBeNull();
    }
    mocks.profile.mockResolvedValueOnce({
      data: { active: true, role: "admin" },
      error: { message: "unavailable" },
    });
    expect((await saveCatalogItem(input)).data).toBeNull();
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect((await saveCatalogItem(input)).data).toBeNull();
    expect((await saveCatalogItem({ ...input, image_path: "../outside" })).data).toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it("calls the versioned atomic RPC then invalidates both catalog and request page", async () => {
    expect(await saveCatalogItem(input)).toEqual({
      data: { item_id: itemId, version: 1 },
      error: null,
    });
    expect(mocks.rpc).toHaveBeenCalledWith("save_procurement_catalog_item", { payload: input });
    expect(mocks.revalidate.mock.calls.map(([route]) => route)).toEqual([
      "/catalog",
      "/requests/new",
    ]);
  });
  it("returns recoverable conflict/duplicate/permission/input errors without raw SQL detail", async () => {
    for (const [code, expected] of [
      ["40001", "หน้าต่างอื่น"],
      ["23505", "รหัสรายการนี้"],
      ["42501", "สิทธิ์"],
      ["22023", "ราคาอ้างอิงใหม่"],
    ]) {
      mocks.rpc.mockResolvedValueOnce({
        data: null,
        error: { code, message: "SQL private details" },
      });
      const result = await saveCatalogItem({ ...input, expected_version: 1, image_path: path });
      expect(result.error).toContain(expected);
      expect(result.error).not.toContain("SQL private details");
      expect(result.data).toBeNull();
    }
    expect(mocks.revalidate).not.toHaveBeenCalled();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("does not claim success when the save response is malformed or connection fails", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });
    expect((await saveCatalogItem(input)).error).toContain("ยืนยัน");
    mocks.rpc.mockRejectedValueOnce(new Error("network"));
    expect((await saveCatalogItem(input)).error).toContain("ค้นหารายการ");
  });
  it("admin search uses its own protected RPC and permits inactive/withdrawn management rows", async () => {
    const data = {
      items: [{ ...entry, active: false, status: "withdrawn" }],
      total: 1,
      categories: [],
    };
    mocks.rpc.mockResolvedValueOnce({ data, error: null });
    expect(await searchCatalogManagement(query)).toEqual({ data, error: null });
    expect(mocks.rpc).toHaveBeenCalledWith("search_procurement_catalog_admin", {
      catalog_query: "",
      category_filter: "",
      page_number: 0,
    });
  });
  it("does not return fallback data on admin search errors", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { message: "missing function" } });
    expect((await searchCatalogManagement(query)).error).toContain("migration");
    expect((await searchCatalogManagement({ ...query, page: -1 })).data).toBeNull();
  });
});

describe("image storage lifecycle and private route", () => {
  it("uploads an immutable verified format under item / actor UUIDs", async () => {
    const result = await uploadCatalogImage(uploadData());
    expect(result.error).toBeNull();
    expect(result.path).toMatch(new RegExp(`^items/${itemId}/${userId}/[a-f0-9-]+\\.png$`));
    expect(mocks.upload).toHaveBeenCalledWith(result.path, expect.any(Uint8Array), {
      contentType: "image/png",
      upsert: false,
      cacheControl: "0",
    });
  });
  it("blocks bad image bytes before reaching storage", async () => {
    expect(
      (await uploadCatalogImage(uploadData(new TextEncoder().encode("not image")))).path,
    ).toBeNull();
    expect(mocks.upload).not.toHaveBeenCalled();
  });
  it("leaves an uploaded path reusable if saving metadata fails", async () => {
    const uploaded = await uploadCatalogImage(uploadData());
    mocks.rpc.mockResolvedValueOnce({ data: null, error: { code: "40001" } });
    expect(
      (await saveCatalogItem({ ...input, expected_version: 1, image_path: uploaded.path })).data,
    ).toBeNull();
    expect(mocks.upload).toHaveBeenCalledTimes(1);
    expect(uploaded.path).not.toBeNull();
  });
  it("never returns a storage URL or path to an unauthenticated image request", async () => {
    mocks.getUser.mockResolvedValueOnce({ data: { user: null }, error: null });
    const response = await imageRoute(new Request("https://app.test/api/catalog-images/x"), {
      params: Promise.resolve({ id: itemId }),
    });
    expect(response.status).toBe(401);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.download).not.toHaveBeenCalled();
  });
  it("checks current image visibility and storage RLS before returning a no-store image", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: path, error: null });
    mocks.download.mockResolvedValueOnce({
      data: new Blob([png()], { type: "image/png" }),
      error: null,
    });
    const response = await imageRoute(new Request("https://app.test/image"), {
      params: Promise.resolve({ id: itemId }),
    });
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(mocks.rpc).toHaveBeenCalledWith("catalog_image_path", { item_uuid: itemId });
    expect(mocks.download).toHaveBeenCalledWith(path);
  });
  it("fails closed for missing/unreadable image and path traversal", async () => {
    for (const data of [null, "../outside", "https://outside.test/image.png"]) {
      mocks.rpc.mockResolvedValueOnce({ data, error: null });
      expect(
        (
          await imageRoute(new Request("https://app.test/image"), {
            params: Promise.resolve({ id: itemId }),
          })
        ).status,
      ).toBe(404);
    }
    expect(mocks.download).not.toHaveBeenCalled();
  });
});
