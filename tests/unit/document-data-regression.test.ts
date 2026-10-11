import { describe, expect, it } from "vitest";
import { createW119Fixture } from "../fixtures/w119-print";
import { createPol02Fixture } from "../fixtures/pol02-print";
import { createPol02PrintData } from "../../app/payments/new/pol02-print-data";
import { toPol01PrintData } from "../../app/requests/[id]/print/pol01-print-data";

// Frozen synthetic inputs capture the entire print-data contract before refactoring.
// These are data regression checks, not a substitute for visual PDF verification.
describe("pre-refactor document data baseline", () => {
  it("preserves the W119 document contract", () => {
    expect(createW119Fixture()).toMatchSnapshot();
  });
  it("preserves POL02 amounts, dates, signatures and attachment ordering", () => {
    const input = createPol02Fixture();
    const before = structuredClone(input);
    expect(createPol02PrintData(input)).toMatchSnapshot();
    expect(input).toEqual(before);
  });
  it("preserves saved POL01 fields and leading-zero budget codes", () => {
    const input = {
      request_no: "POL01-SYNTHETIC",
      title: "รายการทดสอบ",
      rationale: "เพื่อทดสอบเท่านั้น",
      created_at: "2026-10-01T18:00:00Z",
      required_date: "2026-10-19",
      estimated_amount: 120.5,
      form_data: {
        budgetCodes: {
          sourceCode: "02",
          departmentCode: "002301",
          fundCode: "08",
          activityCode: "001234",
        },
      },
      request_items: [
        {
          line_no: 1,
          description: "วัสดุทดสอบ",
          quantity: 2,
          unit: "ชุด",
          unit_price: 60.25,
          total_amount: 120.5,
        },
      ],
    };
    const before = structuredClone(input);
    expect(toPol01PrintData(input)).toMatchSnapshot();
    expect(input).toEqual(before);
  });
});
