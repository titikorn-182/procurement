import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  emptyLoanAgreement,
  loanAgreementSchema,
  loanDueDate,
  readLoanAgreement,
} from "../../app/requests/w119/loan-agreement";
import { w119RequestFormSchema } from "../../app/requests/new/schemas";
import { toW119PrintData } from "../../app/requests/w119/w119-print-data";
import { W119Document } from "../../app/requests/w119/w119-document";
import { LoanAgreementFields } from "../../app/requests/w119/loan-agreement-fields";
import { createLoanAgreementFixture } from "../fixtures/w119-loan";
import { createW119Fixture } from "../fixtures/w119-print";

const form = {
  regulation: "ว119",
  documentNo: "ทดสอบ",
  memoDate: "2026-10-10",
  departmentName: "หน่วยงานทดสอบ",
  phone: "1234",
  addressee: "อธิการบดี",
  selectionCriteria: "เกณฑ์ราคา",
  advanceRequired: true,
  requiresItemAttachment: false,
  budgetCodes: {
    sourceCode: "2",
    departmentCode: "2301",
    fundCode: "2",
    planCode: "1",
    subprojectCode: "1",
    activityCode: "1",
  },
};

describe("W119 loan contract", () => {
  it("renders blank project and purpose fields without sample text", () => {
    const value = emptyLoanAgreement();
    expect(value.projectName).toBe("");
    expect(value.purpose).toBe("");
    const html = renderToStaticMarkup(
      createElement(LoanAgreementFields, { value, onChange: () => {}, total: 0 }),
    );
    const labels = Array.from(html.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/g));
    expect(labels.find((label) => label[1].includes("ชื่อโครงการหรือกิจกรรม"))?.[1]).toContain(
      'value=""',
    );
    expect(
      labels.find((label) => label[1].includes("รายละเอียดค่าใช้จ่าย / วัตถุประสงค์"))?.[1],
    ).toMatch(/<textarea[^>]*><\/textarea>/);
  });
  it("preserves project and purpose entered in a saved agreement", () => {
    const saved = {
      ...createLoanAgreementFixture(),
      projectName: "โครงการที่ผู้ขอกรอกไว้",
      purpose: "วัตถุประสงค์ที่ผู้ขอกรอกไว้",
    };
    expect(readLoanAgreement(saved)).toMatchObject({
      projectName: saved.projectName,
      purpose: saved.purpose,
    });
  });
  it("validates borrower and transfer fields while preserving leading zeroes", () => {
    const result = loanAgreementSchema.parse(createLoanAgreementFixture());
    expect(result.accountNumber).toBe("000-000000-0");
    expect(loanAgreementSchema.safeParse(emptyLoanAgreement()).success).toBe(false);
    expect(loanAgreementSchema.safeParse({ ...result, borrowerName: " " }).success).toBe(false);
    expect(loanAgreementSchema.safeParse({ ...result, accountNumber: "invalid" }).success).toBe(
      false,
    );
    expect(loanAgreementSchema.safeParse({ ...result, purpose: "ก".repeat(1001) }).success).toBe(
      false,
    );
  });
  it("uses calendar days across month/year/leap boundaries, rejects nonexistent dates", () => {
    expect(loanDueDate("2026-06-17")).toBe("2026-07-02");
    expect(loanDueDate("2026-12-25")).toBe("2027-01-09");
    expect(loanDueDate("2028-02-20")).toBe("2028-03-06");
    expect(loanDueDate("2026-02-30")).toBe("");
    expect(loanDueDate("")).toBe("");
    expect(
      loanAgreementSchema.safeParse({ ...createLoanAgreementFixture(), endDate: "2026-02-30" })
        .success,
    ).toBe(false);
    expect(
      loanAgreementSchema.safeParse({ ...createLoanAgreementFixture(), transferDate: "2026-10-21" })
        .success,
    ).toBe(false);
  });
  it("enforces a contract for new borrowing payloads and does not retain it when disabled", () => {
    expect(w119RequestFormSchema.safeParse(form).success).toBe(false);
    const loanAgreement = createLoanAgreementFixture();
    expect(w119RequestFormSchema.parse({ ...form, loanAgreement }).loanAgreement).toEqual(
      loanAgreement,
    );
    expect(
      w119RequestFormSchema.parse({ ...form, loanAgreement, advanceRequired: false }),
    ).not.toHaveProperty("loanAgreement");
    expect(w119RequestFormSchema.safeParse({ ...form, advanceRequired: false }).success).toBe(true);
  });
  it("keeps legacy documents readable without fabricating a loan contract", () => {
    expect(readLoanAgreement(null)).toBeUndefined();
    expect(readLoanAgreement([])).toBeUndefined();
    expect(toW119PrintData({ form_data: { advanceRequired: true } }).loanAgreement).toBeUndefined();
    expect(
      toW119PrintData({
        form_data: { advanceRequired: false, loanAgreement: createLoanAgreementFixture() },
      }).loanAgreement,
    ).toBeUndefined();
  });
  it("prints the contract after the memo with source sections and blank approvals/receipts", () => {
    const data = { ...createW119Fixture(), loanAgreement: createLoanAgreementFixture() };
    const html = renderToStaticMarkup(
      createElement(W119Document, { data, targetId: "test", fontClassName: "psk" }),
    );
    expect(html.indexOf("บันทึกข้อความ")).toBeLessThan(html.indexOf("สัญญาการยืมเงิน"));
    for (const label of [
      "สัญญาการยืมเงิน",
      "ใบรับเงิน",
      "รายการส่งใช้เงินยืม",
      "4 พฤศจิกายน 2569",
      "000-000000-0",
      "6,270.00",
    ])
      expect(html).toContain(label);
    expect(html).not.toContain("นงลักษณ์ มีสุข");
    expect(html).not.toContain("จันทนสกุลวงศ์");
    expect(html).toContain("ได้รับเงินยืมจำนวน ........................ บาท");
    expect(html).toContain('aria-label="รายการส่งใช้เงินยืม"');
    expect(html).toMatch(/<th colSpan="7"[^>]*>รายการส่งใช้เงินยืม<\/th>/);
    expect(html).not.toContain("<caption>");
    const disabled = renderToStaticMarkup(
      createElement(W119Document, {
        data: { ...data, advanceRequired: false },
        targetId: "test",
        fontClassName: "psk",
      }),
    );
    expect(disabled).not.toContain("สัญญาการยืมเงิน");
  });
});
