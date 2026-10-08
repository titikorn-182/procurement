import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { toW119PrintData, w119PdfFileName } from "../../app/requests/w119/w119-print-data";
import { W119Document } from "../../app/requests/w119/w119-document";
import { createW119Fixture } from "../fixtures/w119-print";

describe("W119 memorandum print", () => {
  it("uses the saved memo date and department, preserves numeric strings, order and all six budget codes", () => {
    const result = toW119PrintData({
      request_no: "PW2610-00001",
      created_at: "2025-01-01",
      departments: { name_th: "หน่วยงานหลัก" },
      form_data: {
        memoDate: "2026-10-08",
        departmentName: "ส่วนงานตามบันทึก",
        budgetCodes: {
          sourceCode: "02",
          departmentCode: "2301",
          fundCode: "1",
          planCode: "5102",
          subprojectCode: "51025200",
          activityCode: "0012345678901234567890",
        },
      },
      profiles: { full_name: "ชื่อผู้ขอ", position_title: "ตำแหน่งจริง" },
      request_items: [
        { line_no: 2, description: "สอง", quantity: "2", unit_price: "100.25" },
        { line_no: 1, description: "หนึ่ง", quantity: "1", unit_price: "25" },
      ],
    });
    expect(result.memoDate).toBe("8 ตุลาคม 2569");
    expect(result.department).toBe("ส่วนงานตามบันทึก");
    expect(result.requesterName).toBe("ชื่อผู้ขอ");
    expect(result.requesterPosition).toBe("ตำแหน่งจริง");
    expect(result.items.map((item) => item.description)).toEqual(["หนึ่ง", "สอง"]);
    expect(result.total).toBe(225.5);
    expect(result.budgetCodes).toEqual({
      source: "02",
      department: "2301",
      fund: "1",
      plan: "5102",
      subproject: "51025200",
      activity: "0012345678901234567890",
    });
  });
  it("leaves missing data blank without inventing sample names, official numbers or approval amounts", () => {
    const data = toW119PrintData({
      form_data: { memoDate: "invalid", advanceRequired: "true" },
      request_items: null,
    });
    expect(data.requestNo).toBe("");
    expect(data.requesterName).toBe("");
    expect(data.memoDate).toBe("");
    expect(data.advanceRequired).toBe(false);
    expect(data.items).toEqual([]);
    expect(data.total).toBe(0);
    expect(data).not.toHaveProperty("approver");
    expect(data).not.toHaveProperty("disbursementAmount");
  });
  it("retains every numbered panel and the sample's six-column order without copying its identities", () => {
    const data = createW119Fixture();
    const html = renderToStaticMarkup(
      createElement(W119Document, { data, targetId: "test", fontClassName: "psk" }),
    );
    for (const number of [1, 2, 3, 4, 5, 6, 7]) expect(html).toContain(`(${number})`);
    expect(html).toContain("หน่วยนับ</th><th>จำนวน</th><th>ราคา/หน่วย</th><th>ราคารวม");
    expect(html).toContain("ไม่ใช่หลักฐานยืนยันการอนุมัติหรือการเบิกจ่าย");
    expect(html).toContain("6,270.00");
    expect(html).toContain("ผู้ขอซื้อทดสอบ");
    expect(html).not.toContain("พิมพ์ปพิชญ์");
    expect(html).not.toContain("ฐิติกรณ์รัศมิ์");
    expect(html).not.toContain("ดลฤดี");
    expect(html).not.toContain("ผู้ตรวจรับ");
  });
  it("marks the loan panel not applicable when the requester did not choose an advance", () => {
    const data = { ...createW119Fixture(), advanceRequired: false };
    const html = renderToStaticMarkup(
      createElement(W119Document, { data, targetId: "test", fontClassName: "psk" }),
    );
    expect(html).toContain("ไม่ประสงค์ยืมเงินทดรองราชการ");
    expect(html).not.toContain("เพื่อโปรดพิจารณาอนุมัติยืมเงิน");
    expect(html).toContain("(2)");
  });
  it("does not truncate long Thai content or stored amounts", () => {
    const text = "รายละเอียดภาษาไทย".repeat(300);
    const data = toW119PrintData({
      rationale: text,
      estimated_amount: "1200.50",
      request_items: [
        { description: text, quantity: "1", unit_price: "1200.50", total_amount: "1200.50" },
      ],
    });
    expect(data.rationale).toBe(text);
    expect(data.items[0].description).toBe(text);
    expect(data.total).toBe(1200.5);
  });
  it("uses safe draft and saved PDF filenames", () => {
    expect(w119PdfFileName("")).toBe("W119-draft.pdf");
    expect(w119PdfFileName("PW2610-00001")).toBe("W119-PW2610-00001.pdf");
    expect(w119PdfFileName("../PW2610-00001/?:")).toBe("W119-PW2610-00001.pdf");
  });
});
