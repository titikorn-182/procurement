/** Empty numeric fields must remain distinct from a price explicitly entered as zero. */
export type RequestItemInput = {
  description: string;
  quantity: number | null;
  unit: string;
  unitPrice: number | null;
  marketPrice: number | null;
  priceSource: string;
};

/** Return a new object for every row; examples are placeholders, never submitted data. */
export function emptyRequestItem(): RequestItemInput {
  return {
    description: "",
    quantity: null,
    unit: "",
    unitPrice: null,
    marketPrice: null,
    priceSource: "",
  };
}

/** Shared unrounded calculation only. Completeness and reference-price rules are form-specific. */
export function requestItemAmount(item: RequestItemInput): number | null {
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
