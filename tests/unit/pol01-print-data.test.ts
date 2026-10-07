import { describe, expect, it } from "vitest";
import { printDate, toPol01PrintData } from "../../app/requests/[id]/print/pol01-print-data";

describe("POL-01 print data", () => {
  it("keeps saved values, sorts rows, and does not copy sample contact/budget information", () => {
    const result = toPol01PrintData({
      request_no: "POL01-012",
      estimated_amount: "100.25",
      form_data: { budgetCodes: { departmentCode: "2303", fundCode: "8" } },
      request_items: [
        {
          line_no: 2,
          description: "รายการที่สอง",
          quantity: "1",
          unit_price: "40.25",
          total_amount: "40.25",
        },
        {
          line_no: 1,
          description: "รายการแรก",
          quantity: "2",
          unit_price: "30",
          total_amount: "60",
        },
      ],
    });
    expect(result.items.map((item) => item.lineNo)).toEqual([1, 2]);
    expect(result.total).toBe(100.25);
    expect(result.items[1].total).toBe(40.25);
    expect(result.budgetCodes.department).toBe("2303");
    expect(result.budgetCodes.source).toBe("");
    expect(result.phone).toBe("");
    expect(result.documentNo).toBe("");
  });

  it("formats the document date in Bangkok regardless of the server timezone", () => {
    expect(printDate("2026-10-06T18:00:00Z")).toBe("7 ตุลาคม 2569");
    expect(printDate("bad-date")).toBe("");
    expect(printDate(null)).toBe("");
  });

  it.each(["registered", "new"])("includes the saved %s vendor in the document", (type) => {
    const result = toPol01PrintData({
      form_data: { vendor: { type, name: "  บริษัท ร้านค้าทดสอบ จำกัด  " } },
    });
    expect(result.vendor).toBe("บริษัท ร้านค้าทดสอบ จำกัด");
  });

  it.each([undefined, null, {}, { vendor: null }, { vendor: { name: null } }])(
    "handles requests without a saved vendor",
    (formData) => {
      expect(toPol01PrintData({ form_data: formData }).vendor).toBe("");
    },
  );
});
