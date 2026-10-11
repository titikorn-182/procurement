import { describe, expect, it } from "vitest";
import { readRecord } from "../../lib/data/record";
import { formatThaiAmount, formatThaiBaht } from "../../lib/format/money";
import { formatDocumentMoney } from "../../lib/pdf/format";
import { emptyRequestItem, requestItemAmount } from "../../features/requests/item-input";
import { requestItemLimits } from "../../features/requests/item-limits";
import {
  advanceFundingLabels,
  advanceFundingOptions,
  advanceFundingValues,
  isAdvanceFundingOption,
} from "../../features/requests/funding";
import { requestItemSchema, standardRequestFormSchema } from "../../features/requests/schemas";
import {
  emptyPol01Item,
  isCompletePol01Item,
  pol01ItemAmount,
  pol01ItemsPayload,
} from "../../app/requests/new/item-input";
import {
  emptyW119Item,
  isCompleteW119Item,
  w119ItemAmount,
} from "../../app/requests/w119/item-input";
import { pol01Defaults } from "../../features/requests/forms/pol01/defaults";
import {
  expenseCategories,
  fiscalYears,
  fundSources,
  w119Defaults,
} from "../../features/requests/forms/w119/defaults";

describe("shared money display, not stored-value rounding", () => {
  it.each([0, -0, 0.1 + 0.2, 12.345, -10.5, 1_234_567.89, 999_999_999_999.99, NaN, Infinity])(
    "preserves both legacy display formats for %s",
    (value) => {
      expect(formatThaiBaht(value)).toBe(
        new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(value),
      );
      expect(formatThaiAmount(value)).toBe(
        value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      );
      expect(formatDocumentMoney(value)).toBe(formatThaiAmount(value));
    },
  );
  it("does not introduce a currency symbol into a document amount", () => {
    expect(formatThaiBaht(1234)).toContain("฿");
    expect(formatThaiAmount(1234)).toBe("1,234.00");
  });
});

describe("reading unknown legacy JSON", () => {
  it.each([null, undefined, "text", 1, false, [], ["item"]])(
    "returns an empty record for %s",
    (value) => {
      expect(readRecord(value)).toEqual({});
    },
  );
  it("preserves nested data, zeroes, and object identity without modifying its fields", () => {
    const value = Object.freeze({ code: "00123", empty: "", zero: 0, nested: { value: null } });
    expect(readRecord(value)).toBe(value);
    expect(readRecord(value)).toEqual(value);
    expect(readRecord(null)).not.toBe(readRecord(null));
  });
});

describe("shared item input and form-specific validation", () => {
  const valid = {
    description: "วัสดุ",
    quantity: 2,
    unit: "ชุด",
    unitPrice: 100,
    marketPrice: 120,
    priceSource: "ใบเสนอราคา",
  };
  it("keeps entry-point aliases backed by the same blank-row factory and calculation", () => {
    expect(emptyPol01Item).toBe(emptyRequestItem);
    expect(emptyW119Item).toBe(emptyRequestItem);
    expect(pol01ItemAmount).toBe(requestItemAmount);
    expect(w119ItemAmount).toBe(requestItemAmount);
    const first = emptyRequestItem();
    const second = emptyRequestItem();
    first.description = "first";
    expect(second).toEqual({
      description: "",
      quantity: null,
      unit: "",
      unitPrice: null,
      marketPrice: null,
      priceSource: "",
    });
  });
  it.each([
    [null, 100],
    [0, 100],
    [-1, 100],
    [NaN, 100],
    [Infinity, 100],
    [1, null],
    [1, -1],
    [1, NaN],
    [1, Infinity],
    [Number.MAX_VALUE, 2],
  ])("keeps invalid quantity %s / price %s out of totals", (quantity, unitPrice) => {
    expect(requestItemAmount({ ...emptyRequestItem(), quantity, unitPrice })).toBeNull();
  });
  it("accepts explicit zero price, and leaves fractional multiplication unrounded", () => {
    expect(requestItemAmount({ ...emptyRequestItem(), quantity: 1, unitPrice: 0 })).toBe(0);
    expect(requestItemAmount({ ...emptyRequestItem(), quantity: 3, unitPrice: 0.1 })).toBe(3 * 0.1);
  });
  it("does not accidentally require W119 reference fields in POL01", () => {
    const withoutReference = { ...valid, marketPrice: null, priceSource: "" };
    expect(isCompletePol01Item(withoutReference)).toBe(true);
    expect(isCompleteW119Item(withoutReference)).toBe(false);
    expect(isCompleteW119Item(valid)).toBe(true);
  });
  it("retains W119 step validation separately from the stricter final request schema", () => {
    const longDescription = { ...valid, description: "x".repeat(501) };
    expect(isCompleteW119Item(longDescription)).toBe(true);
    expect(isCompletePol01Item(longDescription)).toBe(false);
    expect(
      requestItemSchema.safeParse({
        line_no: 1,
        description: longDescription.description,
        quantity: 2,
        unit: "ชุด",
        unit_price: 100,
      }).success,
    ).toBe(false);
  });
  it("keeps exact existing request limits", () => {
    expect(requestItemLimits).toEqual({
      count: 200,
      lineNumber: 1000,
      descriptionLength: 500,
      unitLength: 100,
      priceSourceLength: 500,
      quantity: 999_999_999,
      price: 999_999_999_999.99,
    });
    expect(pol01ItemsPayload(Array.from({ length: 200 }, () => ({ ...valid })))).toHaveLength(200);
    expect(pol01ItemsPayload(Array.from({ length: 201 }, () => ({ ...valid })))).toBeNull();
  });
  it.each([
    ["description", "x".repeat(501)],
    ["unit", "x".repeat(101)],
    ["priceSource", "x".repeat(501)],
    ["quantity", 1_000_000_000],
    ["unitPrice", 1_000_000_000_000],
  ] as const)("client and server reject the same exceeded %s limit", (key, value) => {
    const item = { ...valid, [key]: value };
    expect(isCompletePol01Item(item)).toBe(false);
    expect(
      requestItemSchema.safeParse({
        line_no: 1,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unitPrice,
        market_price: item.marketPrice,
        price_source: item.priceSource,
      }).success,
    ).toBe(false);
  });
});

describe("funding options and deliberately distinct form defaults", () => {
  it("keeps the same funding order, labels, and server enum", () => {
    expect(advanceFundingValues).toEqual([
      "borrow_before_purchase",
      "reimburse_after_purchase",
      "faculty_direct_pay_credit_vendor",
    ]);
    expect(advanceFundingOptions).toEqual(
      advanceFundingValues.map((value) => ({ value, label: advanceFundingLabels[value] })),
    );
    for (const value of advanceFundingValues) {
      expect(isAdvanceFundingOption(value)).toBe(true);
      const result = standardRequestFormSchema.safeParse({
        advanceFundingOption: value,
        vendor: { type: "new", name: "ร้านทดสอบ" },
        budgetCodes: { departmentCode: "01", fundCode: "02", activityCode: "03" },
      });
      expect(result.success).toBe(true);
    }
  });
  it.each(["", "other", "toString", "constructor", "__proto__", null, 0])(
    "rejects unknown or inherited option %s",
    (value) => {
      expect(isAdvanceFundingOption(value)).toBe(false);
    },
  );
  it("does not replace POL01 defaults with the newer W119 settings", () => {
    expect(pol01Defaults).toEqual({
      fiscalYear: "2569",
      fundSource: "เงินงบประมาณแผ่นดิน",
      planName: "แผนงานบริหารทั่วไป",
      expenseCategory: "ค่าวัสดุ",
      sourceCode: "2",
      departmentCode: "2301",
      fundCode: "2",
      activityCode: "100210230004",
    });
    expect(fiscalYears).toEqual(["2570", "2571", "2572"]);
    expect(fundSources).toEqual(["งบประมาณเงินรายได้", "งบประมาณเงินอุดหนุน"]);
    expect(expenseCategories).toEqual(["ค่าวัสดุ", "ค่าใช้สอย"]);
    expect(w119Defaults).toMatchObject({
      fiscalYear: "2570",
      fundSource: "งบประมาณเงินรายได้",
      addressee: "อธิการบดีมหาวิทยาลัยอุบลราชธานี",
    });
  });
});
