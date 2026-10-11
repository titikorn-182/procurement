import { emptyPol01Item, type Pol01ItemInput } from "@/app/requests/new/item-input";
import type { CatalogEntry } from "./schema";
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
