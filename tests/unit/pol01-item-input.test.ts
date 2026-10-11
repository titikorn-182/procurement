import { describe, expect, it } from "vitest";
import {
  emptyPol01Item,
  pol01ItemAmount,
  isCompletePol01Item,
  pol01ItemsPayload,
  type Pol01ItemInput,
} from "../../app/requests/new/item-input";
import { requestItemSchema } from "../../app/requests/new/schemas";

const entered: Pol01ItemInput = {
  description: "รายการจริง",
  quantity: 2.5,
  unit: "ชุด",
  unitPrice: 12.5,
  marketPrice: 15,
  priceSource: "ใบเสนอราคาจริง",
};

describe("POL01 item entry", () => {
  it("keeps every initial and added row blank, without storing examples", () => {
    expect(emptyPol01Item()).toEqual({
      description: "",
      quantity: null,
      unit: "",
      unitPrice: null,
      marketPrice: null,
      priceSource: "",
    });
    expect(emptyPol01Item()).not.toBe(emptyPol01Item());
    expect(pol01ItemAmount(emptyPol01Item())).toBeNull();
    expect(pol01ItemsPayload([emptyPol01Item()])).toBeNull();
    expect(pol01ItemsPayload([])).toBeNull();
  });
  it("calculates from entered quantity and unit price, not reference price", () => {
    expect(pol01ItemAmount(entered)).toBe(31.25);
    expect(pol01ItemAmount({ ...entered, marketPrice: 999 })).toBe(31.25);
  });
  it("distinguishes cleared fields from intentional zero prices", () => {
    expect(pol01ItemsPayload([{ ...entered, unitPrice: null }])).toBeNull();
    expect(pol01ItemsPayload([{ ...entered, quantity: null }])).toBeNull();
    const item = { ...entered, unitPrice: 0, marketPrice: 0 };
    expect(pol01ItemAmount(item)).toBe(0);
    expect(pol01ItemsPayload([item])?.[0]).toMatchObject({ unit_price: 0, market_price: 0 });
  });
  it("serializes both new fields and renumbers rows without example data", () => {
    const payload = pol01ItemsPayload([entered, { ...entered, priceSource: "  ราคาตลาด  " }]);
    expect(payload?.[0]).toEqual({
      line_no: 1,
      description: entered.description,
      quantity: 2.5,
      unit: "ชุด",
      unit_price: 12.5,
      market_price: 15,
      price_source: "ใบเสนอราคาจริง",
    });
    expect(payload?.[1]).toMatchObject({ line_no: 2, price_source: "ราคาตลาด" });
    expect(requestItemSchema.safeParse(payload?.[0]).success).toBe(true);
  });
  it("keeps reference data optional for older POL01 requests and permits clearing it", () => {
    const payload = pol01ItemsPayload([{ ...entered, marketPrice: null, priceSource: "" }]);
    expect(payload?.[0]).not.toHaveProperty("market_price");
    expect(payload?.[0].price_source).toBe("");
    expect(requestItemSchema.safeParse(payload?.[0]).success).toBe(true);
  });
  it.each([0, -1, NaN, Infinity, 1_000_000_000])("rejects invalid quantity %s", (quantity) => {
    expect(isCompletePol01Item({ ...entered, quantity })).toBe(false);
  });
  it.each([-1, NaN, Infinity, 1_000_000_000_000])("rejects invalid price %s", (price) => {
    expect(isCompletePol01Item({ ...entered, unitPrice: price })).toBe(false);
    expect(isCompletePol01Item({ ...entered, marketPrice: price })).toBe(false);
  });
  it("rejects blank required text and overlong input", () => {
    for (const patch of [
      { description: " " },
      { unit: " " },
      { description: "x".repeat(501) },
      { unit: "x".repeat(101) },
      { priceSource: "x".repeat(501) },
    ]) {
      expect(isCompletePol01Item({ ...entered, ...patch })).toBe(false);
    }
  });
});
