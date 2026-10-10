import { describe, expect, it } from "vitest";
import {
  emptyW119Item,
  isCompleteW119Item,
  w119ItemAmount,
  type W119ItemInput,
} from "../../app/requests/w119/item-input";

const entered: W119ItemInput = {
  description: "รายการที่กรอกจริง",
  quantity: 2.5,
  unit: "ชิ้น",
  unitPrice: 12.5,
  marketPrice: 15,
  priceSource: "ใบเสนอราคา",
};

describe("W119 item entry", () => {
  it("starts every field empty without sample values or an invented amount", () => {
    expect(emptyW119Item()).toEqual({
      description: "",
      quantity: null,
      unit: "",
      unitPrice: null,
      marketPrice: null,
      priceSource: "",
    });
    expect(emptyW119Item()).not.toBe(emptyW119Item());
    expect(w119ItemAmount(emptyW119Item())).toBeNull();
    expect(isCompleteW119Item(emptyW119Item())).toBe(false);
  });

  it("calculates only entered quantity and unit price, including decimals", () => {
    expect(w119ItemAmount(entered)).toBe(31.25);
    expect(isCompleteW119Item(entered)).toBe(true);
  });

  it.each(["quantity", "unitPrice", "marketPrice"] as const)("rejects a cleared %s", (field) => {
    expect(isCompleteW119Item({ ...entered, [field]: null })).toBe(false);
  });

  it.each(["description", "unit", "priceSource"] as const)("rejects an empty %s", (field) => {
    expect(isCompleteW119Item({ ...entered, [field]: "  " })).toBe(false);
  });

  it("preserves an explicitly entered zero price, unlike an empty price", () => {
    const free = { ...entered, unitPrice: 0, marketPrice: 0 };
    expect(isCompleteW119Item(free)).toBe(true);
    expect(w119ItemAmount(free)).toBe(0);
    expect(w119ItemAmount({ ...free, unitPrice: null })).toBeNull();
    expect(w119ItemAmount({ ...free, quantity: null })).toBeNull();
  });

  it.each([0, -1, NaN, Infinity])("rejects invalid quantity %s", (quantity) => {
    expect(isCompleteW119Item({ ...entered, quantity })).toBe(false);
    expect(w119ItemAmount({ ...entered, quantity })).toBeNull();
  });

  it.each([-1, NaN, Infinity])("rejects invalid price %s", (price) => {
    expect(isCompleteW119Item({ ...entered, unitPrice: price })).toBe(false);
    expect(isCompleteW119Item({ ...entered, marketPrice: price })).toBe(false);
  });
});
