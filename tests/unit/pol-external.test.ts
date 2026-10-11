import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { externalFixture, returnedExternalFixture } from "../fixtures/pol-external";
import {
  createExternalDraft,
  externalDraftSchema,
  externalInput,
  externalItemTotal,
  externalTotal,
  validateExternalSubmission,
} from "../../app/requests/pol-external/model";
import {
  externalPol01Schema,
  externalMetadataMatchesItems,
  externalAmountsValid,
  externalLineAmount,
} from "../../app/requests/pol-external/schema";
import { parseRequestFormData } from "../../app/requests/new/schemas";
import {
  ExternalDocument,
  externalPreviewData,
  toExternalPrintData,
} from "../../app/requests/pol-external/document";

describe("POL external data and source document", () => {
  it("starts with blank transaction values, preserving only institutional defaults", () => {
    const data = createExternalDraft("2026-10-11");
    expect(data).toMatchObject({
      title: "",
      rationale: "",
      budgetYear: 2570,
      planName: "",
      requiredDate: "",
      advanceFundingOption: "",
      metadata: { phone: "3944", addressee: "คณบดีคณะรัฐศาสตร์" },
    });
    expect(data.items).toEqual([
      { description: "", quantity: null, unit: "", unitPrice: null, note: "" },
    ]);
    expect(Object.values(data.budgetCodes)).toEqual(["", "", "", ""]);
    expect(externalDraftSchema.safeParse(data).success).toBe(true);
  });
  it("remains a standard POL-01 request with bounded typed metadata", () => {
    const input = externalInput(externalFixture());
    const parsed = parseRequestFormData(input.formData);
    expect(parsed).toMatchObject({
      success: true,
      data: {
        formType: "standard",
        formVersion: 1,
        requiresLoanAgreement: false,
        externalPol01: {
          method: "hire",
          itemNotes: [{ lineNo: 1, note: "รวมค่าเดินทางและอุปกรณ์แล้ว" }],
        },
      },
    });
    expect(validateExternalSubmission(externalFixture(), 0)).toBeNull();
  });
  it.each(["purchase", "hire", "rent"] as const)(
    "maps %s into the existing workflow kind without losing the document method",
    (method) => {
      const data = externalFixture();
      data.metadata.method = method;
      const input = externalInput(data);
      expect(input.kind).toBe(method === "purchase" ? "purchase" : "hire");
      expect((input.formData as { externalPol01: { method: string } }).externalPol01.method).toBe(
        method,
      );
    },
  );
  it("round-trips partial local drafts and preserves leading zero budget codes", () => {
    const data = externalFixture();
    data.items[0].quantity = null;
    data.rationale = "";
    expect(externalDraftSchema.parse(JSON.parse(JSON.stringify(data)))).toEqual(data);
  });
  it("does not accept another form or executable/unbounded draft fields", () => {
    expect(externalDraftSchema.safeParse({ ...externalFixture(), format: "W804" }).success).toBe(
      false,
    );
    expect(externalDraftSchema.safeParse({ ...externalFixture(), unknown: true }).success).toBe(
      false,
    );
    expect(
      externalDraftSchema.safeParse({
        ...externalFixture(),
        items: Array(201).fill(externalFixture().items[0]),
      }).success,
    ).toBe(false);
  });
  it("restores returned metadata and line notes without default replacement", () => {
    const saved = returnedExternalFixture();
    saved.externalPol01!.phone = "9999";
    expect(createExternalDraft("2027-01-01", saved)).toMatchObject({
      metadata: { phone: "9999", documentNo: "อว ทดสอบ/001" },
      budgetCodes: { activityCode: "001234567890" },
      items: [{ note: "รวมค่าเดินทางและอุปกรณ์แล้ว" }],
    });
  });
  it("rejects impossible dates, duplicate line notes and unrelated item notes", () => {
    const metadata = returnedExternalFixture().externalPol01!;
    expect(externalPol01Schema.safeParse({ ...metadata, memoDate: "2026-02-31" }).success).toBe(
      false,
    );
    expect(
      externalPol01Schema.safeParse({
        ...metadata,
        itemNotes: [
          { lineNo: 1, note: "a" },
          { lineNo: 1, note: "b" },
        ],
      }).success,
    ).toBe(false);
    expect(
      externalMetadataMatchesItems(
        { ...metadata, itemNotes: [{ lineNo: 2, note: "wrong" }] },
        "hire",
        [{ line_no: 1 }],
      ),
    ).toBe(false);
    expect(externalMetadataMatchesItems(metadata, "purchase", [{ line_no: 1 }])).toBe(false);
  });
  it("rejects missing fields at the correct step", () => {
    let data = externalFixture();
    data.title = "";
    expect(validateExternalSubmission(data, 0)?.step).toBe(0);
    data = externalFixture();
    data.items[0].unitPrice = null;
    expect(validateExternalSubmission(data, 0)?.step).toBe(1);
    data = externalFixture();
    data.budgetCodes.sourceCode = "";
    expect(validateExternalSubmission(data, 0)?.step).toBe(2);
    data = externalFixture();
    data.vendor = { kind: "new", vendorName: "รายใหม่" };
    expect(validateExternalSubmission(data, 0)?.step).toBe(3);
    expect(validateExternalSubmission(data, 1)).toBeNull();
  });
  it("distinguishes explicit zero price from blank and uses database precision", () => {
    const item = externalFixture().items[0];
    expect(externalItemTotal({ ...item, unitPrice: 0 })).toBe(0);
    expect(externalItemTotal({ ...item, unitPrice: null })).toBeNull();
    expect(externalLineAmount(0.5, 0.01)).toBe(0.01);
    expect(externalLineAmount(0.001, 12)).toBeNull();
    expect(externalLineAmount(1, 12.001)).toBeNull();
    expect(externalLineAmount(2, 999_999_999_999.99)).toBeNull();
    expect(
      externalAmountsValid([
        { quantity: 1, unit_price: 999_999_999_999.99 },
        { quantity: 1, unit_price: 1 },
      ]),
    ).toBe(false);
    expect(externalTotal(externalFixture())).toBe(3000.5);
  });
  it("prints source-specific heading, actual notes and budget codes without invented signatures", () => {
    const data = externalPreviewData(externalFixture());
    const html = renderToStaticMarkup(
      createElement(ExternalDocument, { data, targetId: "test", fontClassName: "psk" }),
    );
    for (const text of [
      "โครงการบริการวิชาการจากแหล่งทุนภายนอก",
      "ใบขอซื้อ / เช่า / จ้างทั่วไป",
      "3944",
      "รวมค่าเดินทางและอุปกรณ์แล้ว",
      "รายละเอียด TOR",
      "001234567890",
      "3,000.50",
    ])
      expect(html).toContain(text);
    expect(html).not.toContain("ผู้อนุมัติ");
    expect(html).not.toContain("นายฐิติกรณ์");
    expect(html).toContain("ยังไม่ได้ส่งคำขอ");
  });
  it("uses saved metadata for printing and fails closed on corrupted metadata", () => {
    const input = externalInput(externalFixture());
    const record = {
      title: input.title,
      form_data: input.formData,
      request_items: [{ ...input.items[0], total_amount: 3000.5 }],
      estimated_amount: 3000.5,
    };
    expect(toExternalPrintData(record)?.metadata.phone).toBe("3944");
    expect(toExternalPrintData({ ...record, form_data: { externalPol01: {} } })).toBeNull();
  });
});
