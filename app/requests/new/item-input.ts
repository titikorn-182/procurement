import type { NewRequestInput } from "./schemas";

/** Blank inputs are not sample data, and a blank price is distinct from zero. */
export type Pol01ItemInput = {
  description: string;
  quantity: number | null;
  unit: string;
  unitPrice: number | null;
  marketPrice: number | null;
  priceSource: string;
};

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

export function emptyPol01Item(): Pol01ItemInput {
  return {
    description: "",
    quantity: null,
    unit: "",
    unitPrice: null,
    marketPrice: null,
    priceSource: "",
  };
}

export function pol01ItemAmount(item: Pol01ItemInput): number | null {
  if (
    item.quantity == null ||
    !Number.isFinite(item.quantity) ||
    item.quantity <= 0 ||
    item.unitPrice == null ||
    !Number.isFinite(item.unitPrice) ||
    item.unitPrice < 0
  )
    return null;
  const amount = item.quantity * item.unitPrice;
  return Number.isFinite(amount) ? amount : null;
}

export function isCompletePol01Item(
  item: Pol01ItemInput,
): item is Pol01ItemInput & { quantity: number; unitPrice: number } {
  return (
    Boolean(item.description.trim() && item.unit.trim()) &&
    item.description.trim().length <= 500 &&
    item.unit.trim().length <= 100 &&
    pol01ItemAmount(item) !== null &&
    item.quantity! <= 999_999_999 &&
    item.unitPrice! <= 999_999_999_999.99 &&
    (item.marketPrice == null ||
      (Number.isFinite(item.marketPrice) &&
        item.marketPrice >= 0 &&
        item.marketPrice <= 999_999_999_999.99)) &&
    item.priceSource.trim().length <= 500
  );
}

export function pol01ItemsPayload(items: Pol01ItemInput[]): NewRequestInput["items"] | null {
  if (!items.length || items.length > 200 || !items.every(isCompletePol01Item)) return null;
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
