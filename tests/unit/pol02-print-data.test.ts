import { describe, expect, it } from "vitest";
import { createPol02Fixture } from "../fixtures/pol02-print";
import { createPol02PrintData, pol02DraftFileName } from "../../app/payments/new/pol02-print-data";
import { formatThaiDocumentDate } from "../../lib/pdf/format";

describe("POL-02 print data", () => {
  it("preserves payment references, tax, installments, budget and attachment metadata", () => {
    const input = createPol02Fixture();
    const data = createPol02PrintData(input);
    expect(data.details).toEqual(input.details);
    expect(data.details).not.toBe(input.details);
    expect(data.source.requestNo).toBe("POL01-TEST");
    expect(data.source.activityCode).toBe("100210230004");
    expect(data.items[1]).toMatchObject({
      lineNo: 2,
      documentNo: "INV-TEST-002",
      quantity: 20,
      unitPrice: 75,
      total: 1500,
    });
    expect(data.subtotal).toBe(2700);
    expect(data.vat).toBe(189);
    expect(data.total).toBe(2889);
    expect(data.documents).toHaveLength(2);
    expect(data.attachments).toEqual(input.attachmentNames);
    expect(data.documentDate).toBe("7 ตุลาคม 2569");
  });

  it("uses the latest edited values without changing source data or creating a payment number", () => {
    const input = createPol02Fixture();
    input.details.vendorName = "ร้านใหม่ตามใบแจ้งหนี้";
    input.details.installmentNumber = "3";
    const data = createPol02PrintData(input);
    expect(data.details.vendorName).toBe("ร้านใหม่ตามใบแจ้งหนี้");
    expect(data.details.installmentNumber).toBe("3");
    expect(input.request.vendorName).toBe("บริษัท ผู้ประกอบการตัวอย่าง จำกัด");
    expect(data).not.toHaveProperty("paymentNo");
    expect(pol02DraftFileName(input.request.requestNo)).toBe("POL02-draft-POL01-TEST.pdf");
  });

  it("handles an incomplete draft and unsafe filename characters", () => {
    const input = createPol02Fixture();
    input.details.vat = "";
    input.details.contractAmount = "";
    input.lines[0].quantity = "";
    input.lines[1].unitPrice = "not-a-number";
    input.selectedDocuments = [];
    input.attachmentNames = [];
    const data = createPol02PrintData(input);
    expect(data.total).toBe(0);
    expect(data.contractAmount).toBe(0);
    expect(data.documents).toEqual([]);
    expect(data.attachments).toEqual([]);
    expect(formatThaiDocumentDate("")).toBe("");
    expect(pol02DraftFileName("../POL01-001/?:")).toBe("POL02-draft-POL01-001.pdf");
  });

  it("keeps decimal totals and prints only selected known document categories once", () => {
    const input = createPol02Fixture();
    input.lines[0].quantity = "1.5";
    input.lines[0].unitPrice = "0.10";
    input.lines[1].quantity = "1";
    input.lines[1].unitPrice = "0.20";
    input.details.vat = "0.02";
    input.selectedDocuments = ["inspection", "inspection", "unknown"];
    const data = createPol02PrintData(input);
    expect(data.subtotal).toBe(0.35);
    expect(data.total).toBe(0.37);
    expect(data.documents).toHaveLength(1);
  });
});
