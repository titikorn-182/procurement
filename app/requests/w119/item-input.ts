import {
  requestItemAmount as w119ItemAmount,
  type RequestItemInput as W119ItemInput,
} from "@/features/requests/item-input";
export {
  emptyRequestItem as emptyW119Item,
  requestItemAmount as w119ItemAmount,
} from "@/features/requests/item-input";
export type { RequestItemInput as W119ItemInput } from "@/features/requests/item-input";

export type CompleteW119Item = W119ItemInput & {
  quantity: number;
  unitPrice: number;
  marketPrice: number;
};

export function isCompleteW119Item(item: W119ItemInput): item is CompleteW119Item {
  return (
    Boolean(item.description.trim() && item.unit.trim() && item.priceSource.trim()) &&
    w119ItemAmount(item) !== null &&
    item.marketPrice != null &&
    Number.isFinite(item.marketPrice) &&
    item.marketPrice >= 0
  );
}
