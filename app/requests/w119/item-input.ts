/** Empty numeric fields stay distinct from an explicitly entered zero price. */
export type W119ItemInput = {
  description: string;
  quantity: number | null;
  unit: string;
  unitPrice: number | null;
  marketPrice: number | null;
  priceSource: string;
};

export type CompleteW119Item = W119ItemInput & {
  quantity: number;
  unitPrice: number;
  marketPrice: number;
};

export function emptyW119Item(): W119ItemInput {
  return {
    description: "",
    quantity: null,
    unit: "",
    unitPrice: null,
    marketPrice: null,
    priceSource: "",
  };
}

export function w119ItemAmount(item: W119ItemInput): number | null {
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

export function isCompleteW119Item(item: W119ItemInput): item is CompleteW119Item {
  return (
    Boolean(item.description.trim() && item.unit.trim() && item.priceSource.trim()) &&
    w119ItemAmount(item) !== null &&
    item.marketPrice != null &&
    Number.isFinite(item.marketPrice) &&
    item.marketPrice >= 0
  );
}
