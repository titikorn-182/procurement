import { z } from "zod";
import { emptyPol01Item, type Pol01ItemInput } from "./item-input";

export const catalogQuerySchema = z.object({
  query: z.string().trim().max(120),
  category: z.string().max(30),
  page: z.number().int().min(0).max(10000),
});

export const catalogEntrySchema = z.object({
  item_id: z.uuid(),
  price_id: z.uuid(),
  import_id: z.uuid().nullable(),
  origin: z.enum(["excel", "manual"]).default("excel"),
  version: z.number().int().positive().default(1),
  active: z.boolean().default(true),
  image_path: z.string().nullable().default(null),
  item_code: z.string().min(1).max(100),
  category_code: z.string(),
  category_name: z.string(),
  subcategory: z.string(),
  name: z.string().min(1).max(300),
  specification: z.string().max(1000),
  unit: z.string().min(1).max(100),
  notes: z.string(),
  reference_price: z.number().finite().min(0).max(999_999_999_999.99),
  source_name: z.string().min(1).max(300),
  reference_date: z.iso.date().nullable(),
  valid_until: z.iso.date().nullable(),
  status: z.enum(["unverified", "verified", "withdrawn"]),
  expired: z.boolean(),
  sheet_name: z.string().nullable(),
  row_number: z.number().int().positive().nullable(),
  file_name: z.string().nullable(),
});

export const catalogDataSchema = z.object({
  items: z.array(catalogEntrySchema).max(20),
  total: z.number().int().nonnegative(),
  categories: z.array(z.object({ code: z.string(), name: z.string() })),
});

export type CatalogEntry = z.infer<typeof catalogEntrySchema>;
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
export type CatalogData = z.infer<typeof catalogDataSchema>;
export type CatalogResult = { data: CatalogData | null; error: string | null };

export function catalogPriceWarning(entry: CatalogEntry) {
  if (!entry.active) return "รายการนี้ปิดใช้งานแล้ว";
  if (entry.status === "withdrawn") return "ราคาอ้างอิงนี้ถูกถอนแล้ว กรุณาบันทึกราคาใหม่ก่อนใช้งาน";
  if (entry.expired) return "ราคาอ้างอิงหมดอายุ กรุณาตรวจสอบราคาใหม่";
  if (!entry.reference_date && entry.status !== "verified") return "ยังไม่ยืนยันวันที่และการรับรอง";
  if (!entry.reference_date) return "ยังไม่ระบุวันที่อ้างอิง";
  if (entry.status !== "verified") return "ยังไม่รับรองราคา";
  return "ตรวจสอบราคาและหน่วยให้ตรงกับคำขอก่อนใช้";
}

/** User-authorized workbook reference, not a quotation or a certified price. */
export function catalogItemSnapshot(entry: CatalogEntry): Pol01ItemInput | null {
  if (entry.expired || !entry.active || entry.status === "withdrawn") return null;
  const description = [entry.name, entry.specification].filter(Boolean).join(" — ");
  const priceSource = [
    `${entry.origin === "manual" ? "ผู้ดูแลระบบ" : "Excel"}: ${entry.source_name}`,
    entry.item_code,
    ...(entry.origin === "excel" && entry.sheet_name && entry.row_number
      ? [`${entry.sheet_name}!H${entry.row_number}`]
      : []),
    entry.reference_date ? `วันที่ ${entry.reference_date}` : "ไม่ระบุวันที่ราคา",
    entry.status === "verified" ? "รับรองแล้ว" : "ยังไม่รับรอง",
    `ref:${entry.price_id}`,
  ].join(" | ");
  if (description.length > 500 || priceSource.length > 500) return null;
  return {
    ...emptyPol01Item(),
    description,
    unit: entry.unit,
    marketPrice: entry.reference_price,
    priceSource,
  };
}

export function addCatalogItem(items: Pol01ItemInput[], entry: CatalogEntry) {
  const snapshot = catalogItemSnapshot(entry);
  if (!snapshot) return null;
  // Partially completed inputs, including explicit zero, belong to the user.
  const blank = items.findIndex(
    (item) =>
      !item.description.trim() &&
      !item.unit.trim() &&
      !item.priceSource.trim() &&
      item.quantity === null &&
      item.unitPrice === null &&
      item.marketPrice === null,
  );
  if (blank < 0) return items.length < 200 ? [...items, snapshot] : null;
  return items.map((item, index) => (index === blank ? snapshot : item));
}
