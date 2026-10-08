import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import {
  POL01_CHECKLIST_CATEGORIES,
  createPol01Checklist,
  getPol01ChecklistGroups,
  reconcilePol01Checklist,
  summarizePol01Checklist,
  type Pol01Checklist,
} from "../../app/requests/pol01-checklist";
import {
  pol01ChecklistSchema,
  readPol01Checklist,
} from "../../app/requests/pol01-checklist-schema";
import { parseRequestFormData } from "../../app/requests/new/schemas";
import { Pol01ChecklistSummary } from "../../app/requests/components/pol01-checklist-summary";
import { Pol01ChecklistFields } from "../../app/requests/components/pol01-checklist-fields";

const ordinary = { newVendor: false, borrowing: false };
const allConditions = { newVendor: true, borrowing: true };

describe("POL01 source-backed checklist", () => {
  it.each([false, true])(
    "keeps the conditional button's accessible name aligned with its visible action: selected=%s",
    (selected) => {
      const value = createPol01Checklist();
      if (selected) value.entries["basic.approved_project"] = "not_applicable";
      const html = renderToStaticMarkup(
        createElement(Pol01ChecklistFields, {
          value,
          context: ordinary,
          onChange: () => {},
        }),
      );
      const action = selected ? "ยกเลิกไม่เกี่ยวข้อง" : "ไม่เกี่ยวข้อง";
      expect(html).toContain(
        `aria-label="${action}: เอกสารพื้นฐาน — โครงการที่ได้รับอนุมัติแล้ว (ถ้ามี)"`,
      );
      expect(html).toContain(`>${action}</button>`);
    },
  );
  it("covers all 15 selectable categories, splitting general and vehicle rental", () => {
    expect(POL01_CHECKLIST_CATEGORIES).toHaveLength(15);
    expect(new Set(POL01_CHECKLIST_CATEGORIES.map((category) => category.id)).size).toBe(15);
    for (const group of getPol01ChecklistGroups(
      POL01_CHECKLIST_CATEGORIES.map((category) => category.id),
      allConditions,
    )) {
      expect(new Set(group.items.map((item) => item.id)).size).toBe(group.items.length);
      expect(
        group.items.some((item) => /ใบเสร็จ|ใบกำกับภาษี|ไฟล์รายงานขอซื้อขอจ้าง/.test(item.label)),
      ).toBe(false);
    }
  });

  it("preserves equipment quotations and comparison quote as main items", () => {
    const group = getPol01ChecklistGroups(["equipment"], ordinary)[1];
    expect(group.items.map((item) => item.id)).toEqual([
      "specification",
      "items",
      "market_price",
      "quotation",
      "comparison_quote",
    ]);
    expect(group.items.every((item) => !item.optional)).toBe(true);
  });

  it("preserves ICT, vehicle-specific documents, and conditional transport permit", () => {
    const groups = getPol01ChecklistGroups(["computer", "vehicle_rental"], ordinary);
    expect(groups[1].items.find((item) => item.id === "ict")?.optional).toBeUndefined();
    expect(groups[2].items.filter((item) => !item.optional).map((item) => item.id)).toEqual([
      "details",
      "photos",
      "registration",
      "driver_license",
    ]);
    expect(groups[2].items.find((item) => item.id === "transport_license")?.optional).toBe(true);
  });

  it("distinguishes required custom-goods TOR from optional service TOR", () => {
    const groups = getPol01ChecklistGroups(["custom_goods", "service"], ordinary);
    expect(groups[1].items.find((item) => item.id === "tor")?.optional).not.toBe(true);
    expect(groups[2].items.find((item) => item.id === "tor")?.optional).toBe(true);
  });

  it("shows a single optional loan contract only for borrowing", () => {
    expect(getPol01ChecklistGroups([], ordinary)[0].items).toHaveLength(2);
    const items = getPol01ChecklistGroups([], allConditions)[0].items;
    expect(items).toHaveLength(5);
    expect(items.find((item) => item.id === "loan_agreement")?.optional).toBe(true);
    expect(items.find((item) => item.id === "vendor_documents")?.optional).not.toBe(true);
  });

  it("clears deselected categories, stale conditional answers, and invalid exemptions", () => {
    const input: Pol01Checklist = {
      version: 1,
      categories: ["office"],
      entries: {
        "basic.approved_project": "not_applicable",
        "basic.loan_agreement": "checked",
        "basic.vendor_documents": "checked",
        "equipment.comparison_quote": "checked",
        "office.items": "not_applicable",
        "office.specification": "checked",
      },
    };
    expect(reconcilePol01Checklist(input, ordinary).entries).toEqual({
      "basic.approved_project": "not_applicable",
      "office.specification": "checked",
    });
    expect(input.entries["basic.loan_agreement"]).toBe("checked");
  });

  it("counts unchecked, checked, and inapplicable entries independently", () => {
    const value: Pol01Checklist = {
      version: 1,
      categories: ["fuel"],
      entries: {
        "basic.approved_project": "not_applicable",
        "fuel.items": "checked",
      },
    };
    expect(summarizePol01Checklist(value, ordinary)).toEqual({
      total: 4,
      checked: 1,
      notApplicable: 1,
      pending: 2,
    });
  });

  it.each([
    undefined,
    null,
    {},
    { version: 99 },
    { version: 1, categories: ["unknown"], entries: {} },
  ])("reads legacy or malformed stored data without inventing checked documents: %j", (value) => {
    expect(readPol01Checklist(value, ordinary)).toEqual(createPol01Checklist());
  });

  it.each([
    { version: 1, categories: ["office", "office"], entries: {} },
    { version: 1, categories: ["office"], entries: { "office.items": "not_applicable" } },
    { version: 1, categories: [], entries: { unknown: "checked" } },
    { version: 1, categories: [], entries: { "basic.approved_project": "approved" } },
    { version: 1, categories: [], entries: {}, adminApproved: true },
  ])("rejects untrusted checklist data: %j", (value) => {
    expect(pol01ChecklistSchema.safeParse(value).success).toBe(false);
  });

  it("round-trips through create/edit validation and storage without becoming a submission gate", () => {
    const form = {
      advanceFundingOption: "borrow_before_purchase",
      requiresLoanAgreement: true,
      vendor: null,
      budgetCodes: { departmentCode: "2301", fundCode: "2", activityCode: "100210230004" },
      documentChecklist: {
        version: 1,
        categories: ["equipment"],
        entries: { "equipment.quotation": "checked" },
      },
    };
    const parsed = parseRequestFormData(form);
    expect(parsed.success).toBe(true);
    if (!parsed.success || parsed.data.formType !== "standard") throw new Error("expected POL01");
    expect(parsed.data.requiresLoanAgreement).toBe(false);
    const restored = readPol01Checklist(JSON.parse(JSON.stringify(parsed.data.documentChecklist)), {
      ...ordinary,
      borrowing: true,
    });
    expect(restored).toEqual(form.documentChecklist);
    expect(
      summarizePol01Checklist(restored, { ...ordinary, borrowing: true }).pending,
    ).toBeGreaterThan(0);
    const resubmitted = parseRequestFormData({ ...form, documentChecklist: restored });
    expect(resubmitted.success).toBe(true);
  });

  it("includes readable statuses and no false approval claim in the review summary", () => {
    const html = renderToStaticMarkup(
      createElement(Pol01ChecklistSummary, {
        context: ordinary,
        value: { version: 1, categories: ["office"], entries: { "office.items": "checked" } },
      }),
    );
    expect(html).toContain("เช็คลิสต์ POL-01: ตรวจแล้ว 1 / 7 รายการ");
    expect(html).toContain("ไม่ใช่ผลตรวจหรือการอนุมัติของเจ้าหน้าที่");
    expect(html).toContain("ยังไม่ตรวจ");
  });
});
