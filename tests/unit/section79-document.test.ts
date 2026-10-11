import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Section79Document } from "../../app/requests/section79/document";
import { createSection79Draft, SIGNATORY_ROLES } from "../../app/requests/section79/model";

function fixture() {
  const data = createSection79Draft("2570");
  data.memoNumber = "อว 0604.19/ทดสอบ79";
  data.memoDate = "2026-10-11";
  data.description = "ซ่อมแซมเครื่องปรับอากาศ";
  data.requester = { name: "ผู้ดำเนินการทดสอบ", position: "เจ้าหน้าที่ทดสอบ" };
  data.vendor = "ร้านทดสอบ";
  data.receipt = { kind: "receipt", book: "12", number: "00079", date: "2026-10-10" };
  data.urgentReason = "อุปกรณ์ชำรุดกะทันหันและกระทบการปฏิบัติงาน";
  data.amount = 4321.5;
  data.payee = "ผู้รับเงินทดสอบ";
  data.budget = {
    fiscalYear: "2570",
    source: "งบประมาณเงินรายได้",
    fund: "กองทุนทดสอบ",
    activity: "กิจกรรมทดสอบ",
    project: "โครงการทดสอบ",
    sourceCode: "02",
    departmentCode: "02301",
    fundCode: "01",
    activityCode: "000079",
  };
  return data;
}

function render(data = fixture()) {
  return renderToStaticMarkup(createElement(Section79Document, { data, fontClassName: "psk" }));
}

describe("Section 79 document template", () => {
  it("keeps its masthead visible in native print without relying on a screen wrapper", () => {
    const css = readFileSync(
      new URL("../../app/requests/section79/document.module.css", import.meta.url),
      "utf8",
    );
    expect(css).toMatch(
      /@media print\s*\{[\s\S]*\.page \.memoHeading\s*\{\s*display:\s*block\s*!important;/,
    );
    const html = render();
    expect(html).toMatch(
      /<header[^>]*>[\s\S]*บันทึกข้อความ[\s\S]*ไม่เกิน 5 แสนบาท[\s\S]*<\/header>/,
    );
  });

  it("renders memo data, dates, receipt and Thai currency words from the same draft", () => {
    const html = render();
    for (const text of [
      "บันทึกข้อความ",
      "อว 0604.19/ทดสอบ79",
      "11 ตุลาคม 2569",
      "10 ตุลาคม 2569",
      "ผู้ดำเนินการทดสอบ",
      "เจ้าหน้าที่ทดสอบ",
      "ซ่อมแซมเครื่องปรับอากาศ",
      "ร้านทดสอบ",
      "ใบเสร็จรับเงิน",
      "00079",
      "อุปกรณ์ชำรุดกะทันหัน",
      "4,321.50",
      "สี่พันสามร้อยยี่สิบเอ็ดบาทห้าสิบสตางค์",
      "ผู้รับเงินทดสอบ",
      "2570",
      "งบประมาณเงินรายได้",
      "กองทุนทดสอบ",
      "กิจกรรมทดสอบ",
      "โครงการทดสอบ",
    ])
      expect(html).toContain(text);
  });

  it("keeps all six opinion roles and eight decision boxes unsigned and unselected", () => {
    const html = render();
    SIGNATORY_ROLES.forEach((role) => expect(html).toContain(role));
    expect(html.match(/data-opinion="/g)).toHaveLength(6);
    expect(html.match(/data-empty-decision=/g)).toHaveLength(8);
    expect(html).not.toMatch(/checked|aria-checked|type="checkbox"/);
    expect(html).not.toContain("นายฐิติกรณ์");
    expect(html).not.toContain("นางสาวศิริพร");
    expect(html).toContain("ไม่ใช่หลักฐานยืนยันการอนุมัติ");
  });

  it("includes each editable signatory identity without replacing the opinion headings", () => {
    const data = fixture();
    data.signatories = data.signatories.map((person, index) => ({
      name: `ผู้ลงนามทดสอบ${index + 1}`,
      position: `${person.position}ทดสอบ`,
    }));
    const html = render(data);
    data.signatories.forEach(({ name, position }) => {
      expect(html).toContain(name);
      expect(html).toContain(position);
    });
  });

  it("preserves all four budget codes including leading zeroes", () => {
    const html = render();
    for (const text of ["รหัสแหล่งเงิน", "รหัสหน่วยงาน", "รหัสกองทุน", "รหัสกิจกรรม"])
      expect(html).toContain(text);
    for (const code of ["02", "02301", "01", "000079"]) expect(html).toContain(`>${code}</td>`);
  });

  it("supports hire and delivery evidence without asserting a paid receipt", () => {
    const data = fixture();
    data.kind = "hire";
    data.receipt.kind = "delivery";
    const html = render(data);
    expect(html).toContain("ได้ดำเนินการจัดจ้าง");
    expect(html).toContain("(ใบส่งของ)");
    expect(html).not.toContain("ใบเสร็จรับเงิน");
  });

  it("leaves absent values blank and marks pagination and capture-critical content", () => {
    const html = render(createSection79Draft("2570"));
    expect(html).toContain('id="section79-print-document"');
    expect(html).toMatch(/class="[^"]*\bpsk\b/);
    expect(html.match(/data-pdf-required-content=/g)?.length).toBeGreaterThanOrEqual(5);
    expect(html).toMatch(/<table[^>]+data-page-break-before=/);
    expect(html.match(/data-flow-text=/g)?.length).toBeGreaterThanOrEqual(7);
    expect(html).toContain("ไม่เกิน 5 แสนบาท");
    expect(html).not.toContain("NaN");
    expect(html).not.toContain("ศูนย์บาทถ้วน");
  });

  it("escapes free text rather than inserting executable HTML into the document", () => {
    const data = fixture();
    data.urgentReason = '<script>alert("test")</script>';
    const html = render(data);
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
