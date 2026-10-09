import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  createW804Draft,
  documentErrors,
  itemTotal,
  parseW804Draft,
  totals,
  w804DraftSchema,
} from "../../app/requests/w804/model";
import { documentKind, W804_DOCUMENTS } from "../../app/requests/w804/config";
import { W804Document } from "../../app/requests/w804/document";
import { createW804Fixture } from "../fixtures/w804";

describe("W804 local document workspace", () => {
  it("defines exactly three report destinations and defaults safely", () => {
    expect(W804_DOCUMENTS.map(({ id }) => id)).toEqual(["purchase", "summary", "settlement"]);
    expect(documentKind(["summary"])).toBe("purchase");
    expect(documentKind("summary")).toBe("summary");
  });
  it("starts with no sample people, prices, approval references or conditions", () => {
    const blank = createW804Draft("2570");
    expect(w804DraftSchema.safeParse(blank).success).toBe(true);
    expect(blank.preparer.name).toBe("");
    expect(blank.approvalNumber).toBe("");
    expect(blank.penalty).toBe("");
    expect(totals(blank).requested).toBe(0);
    expect(documentErrors(blank, "purchase").length).toBeGreaterThan(0);
  });
  it.each(W804_DOCUMENTS)("validates complete $id data", ({ id }) => {
    expect(documentErrors(createW804Fixture(), id)).toEqual([]);
  });
  it("allows exactly 50,000 and refuses 50,000.01 before printing", () => {
    const draft = createW804Fixture();
    draft.items[0] = { ...draft.items[0], quantity: 1, unitPrice: 50000 };
    expect(documentErrors(draft, "purchase")).toEqual([]);
    draft.items[0].unitPrice = 50000.01;
    expect(documentErrors(draft, "purchase").join()).toContain("ไม่เกิน 50,000");
  });
  it("sums per-line satang consistently", () => {
    const data = createW804Fixture();
    data.items = [
      { ...data.items[0], quantity: 3, unitPrice: 0.1 },
      { ...data.items[0], quantity: 1.5, unitPrice: 1.01 },
    ];
    expect(itemTotal(data.items[1])).toBe(1.52);
    expect(totals(data).requested).toBe(1.82);
  });
  it("distinguishes unused budget from cash to return", () => {
    const data = createW804Fixture();
    data.approvedAmount = 2000;
    expect(totals(data)).toMatchObject({ spent: 1400, budgetBalance: 600, loanBalance: 100 });
  });
  it("blocks over-budget spend and negative loan balances", () => {
    const data = createW804Fixture();
    data.receipts[0].amount = 1600;
    expect(documentErrors(data, "summary").join()).toContain("ยอดซื้อจริง");
    expect(documentErrors(data, "settlement").join()).toContain("ยอดใช้จริงเกินเงินยืม");
  });
  it("requires loan details only for the settlement document", () => {
    const data = createW804Fixture();
    data.loanNumber = "";
    data.loanDate = "";
    data.loanAmount = 0;
    expect(documentErrors(data, "summary")).toEqual([]);
    expect(documentErrors(data, "settlement").join()).toContain("สัญญายืมเงิน");
  });
  it("requires actual vendor, receipt, date and quantities in purchase results", () => {
    const data = createW804Fixture();
    data.receipts[0].quantity = "";
    expect(documentErrors(data, "summary").join()).toContain("จำนวน/หน่วย");
  });
  it("rejects non-finite numbers, fractional satang, impossible dates and excessive rows", () => {
    const data = createW804Fixture();
    expect(w804DraftSchema.safeParse({ ...data, approvedAmount: Infinity }).success).toBe(false);
    expect(w804DraftSchema.safeParse({ ...data, loanAmount: -1 }).success).toBe(false);
    expect(w804DraftSchema.safeParse({ ...data, loanAmount: 1.001 }).success).toBe(false);
    expect(w804DraftSchema.safeParse({ ...data, approvalDate: "2026-02-30" }).success).toBe(false);
    expect(
      w804DraftSchema.safeParse({ ...data, items: Array(101).fill(data.items[0]) }).success,
    ).toBe(false);
  });
  it("round-trips drafts and budget code leading zeroes without retaining injected fields", () => {
    const data = createW804Fixture();
    const restored = parseW804Draft(
      JSON.stringify({ ...data, status: "approved", owner_id: "someone" }),
    );
    expect(restored).toEqual(data);
    expect(restored.budget.activityCode).toBe("0000123456");
    expect(restored).not.toHaveProperty("status");
  });
  it("rejects wrong versions, corrupt and oversized import files", () => {
    expect(() => parseW804Draft("not-json")).toThrow();
    expect(() => parseW804Draft(JSON.stringify({ ...createW804Fixture(), version: 2 }))).toThrow();
    expect(() => parseW804Draft(" ".repeat(250001))).toThrow("250 KB");
  });
  it.each(W804_DOCUMENTS)(
    "prints faculty identity without municipal example data: $id",
    ({ id }) => {
      const html = renderToStaticMarkup(
        createElement(W804Document, { data: createW804Fixture(), kind: id, fontClassName: "psk" }),
      );
      expect(html).toContain("คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี");
      expect(html).not.toContain("เทศบาล");
      expect(html).not.toContain("นางทิพย์รดา");
      expect(html).toContain("ไม่ใช่หลักฐานยืนยันการอนุมัติหรือรับคืนเงิน");
      expect(html.includes("data-page-break-before")).toBe(id === "purchase");
      expect(html.includes("รายละเอียดคุณลักษณะเฉพาะ (TOR)")).toBe(id === "purchase");
      expect(html).toMatch(/data-w804-conclusion[^>]*><h2[^>]*>.*ข้อเสนอเพื่อพิจารณา/);
    },
  );
});
