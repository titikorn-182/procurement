import type { NewRequestInput } from "./schemas";
import {
  requestItemAmount as pol01ItemAmount,
  type RequestItemInput as Pol01ItemInput,
} from "@/features/requests/item-input";
import { requestItemLimits } from "@/features/requests/item-limits";
export {
  emptyRequestItem as emptyPol01Item,
  requestItemAmount as pol01ItemAmount,
} from "@/features/requests/item-input";
export type { RequestItemInput as Pol01ItemInput } from "@/features/requests/item-input";

export const pol01ItemExamples = [
  {
    description: "กระดาษถ่ายเอกสาร A4 80 แกรม",
    quantity: "10",
    unit: "รีม",
    price: "120",
    source: "ใบเสนอราคา",
  },
  {
    description: "แฟ้มสันกว้าง 3 นิ้ว",
    quantity: "20",
    unit: "เล่ม",
    price: "75",
    source: "ราคาตลาด",
  },
  {
    description: "ปากกาลูกลื่นสีน้ำเงิน",
    quantity: "50",
    unit: "ด้าม",
    price: "8",
    source: "ราคาที่เคยซื้อครั้งล่าสุด",
  },
];

export function isCompletePol01Item(
  item: Pol01ItemInput,
): item is Pol01ItemInput & { quantity: number; unitPrice: number } {
  return (
    Boolean(item.description.trim() && item.unit.trim()) &&
    item.description.trim().length <= requestItemLimits.descriptionLength &&
    item.unit.trim().length <= requestItemLimits.unitLength &&
    pol01ItemAmount(item) !== null &&
    item.quantity! <= requestItemLimits.quantity &&
    item.unitPrice! <= requestItemLimits.price &&
    (item.marketPrice == null ||
      (Number.isFinite(item.marketPrice) &&
        item.marketPrice >= 0 &&
        item.marketPrice <= requestItemLimits.price)) &&
    item.priceSource.trim().length <= requestItemLimits.priceSourceLength
  );
}

export function pol01ItemsPayload(items: Pol01ItemInput[]): NewRequestInput["items"] | null {
  if (!items.length || items.length > requestItemLimits.count || !items.every(isCompletePol01Item))
    return null;
  return items.map((item, index) => ({
    line_no: index + 1,
    description: item.description.trim(),
    quantity: item.quantity,
    unit: item.unit.trim(),
    unit_price: item.unitPrice,
    ...(item.marketPrice == null ? {} : { market_price: item.marketPrice }),
    price_source: item.priceSource.trim(),
  }));
}
