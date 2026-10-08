import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  POL02_CHECKLIST_CATEGORIES,
  createPol02Checklist,
  getPol02ChecklistGroups,
  getPol02DocumentIds,
  getPol02DocumentLabels,
  reconcilePol02Checklist,
  type Pol02Checklist,
} from "../../app/payments/new/pol02-checklist";
import { pol02SupportingChecklistSchema } from "../../app/payments/new/pol02-checklist-schema";
import { Pol02ChecklistFields } from "../../app/payments/new/pol02-checklist-fields";
import { pol02DocumentChecklist } from "../../app/payments/new/pol02";

describe("POL02 source checklist", () => {
  it("covers the POL02 column for all 15 categories without POL01-only documents", () => {
    expect(POL02_CHECKLIST_CATEGORIES).toHaveLength(15);
    expect(new Set(POL02_CHECKLIST_CATEGORIES.map(({ id }) => id)).size).toBe(15);
    const value = createPol02Checklist(
      POL02_CHECKLIST_CATEGORIES.map(({ id }) => id),
      true,
    );
    for (const group of getPol02ChecklistGroups(value).slice(1)) {
      expect(group.items[0].id).toBe("pr");
      expect(new Set(group.items.map(({ id }) => id)).size).toBe(group.items.length);
      expect(
        group.items.some(({ label }) => /TOR|ใบเสนอราคา|สัญญายืม|ใบขับขี่|ทะเบียนรถ/.test(label)),
      ).toBe(false);
    }
  });

  it("retains the source's fuel, rental, vehicle rental and individual-hire differences", () => {
    const groups = getPol02ChecklistGroups(
      createPol02Checklist(["fuel", "rental", "vehicle_rental", "individual_hire"]),
    );
    const fuel = groups.find(({ id }) => id === "fuel")!;
    expect(fuel.items.map(({ id }) => id)).toEqual(["pr", "cash_receipt"]);
    expect(fuel.items[1].label).not.toContain("ใบสำคัญรับเงิน");
    expect(groups.find(({ id }) => id === "rental")!.items.map(({ id }) => id)).toEqual([
      "pr",
      "cash_receipt",
      "photos",
    ]);
    expect(groups.find(({ id }) => id === "vehicle_rental")!.items.map(({ id }) => id)).toEqual([
      "pr",
      "cash_receipt",
    ]);
    expect(groups.find(({ id }) => id === "individual_hire")!.items.map(({ id }) => id)).toEqual([
      "pr",
      "handover",
      "payment_voucher",
    ]);
  });

  it("distinguishes required photos of produced goods from conditional photos after repair", () => {
    const groups = getPol02ChecklistGroups(
      createPol02Checklist(["custom_goods", "maintenance", "equipment", "rental"]),
    );
    for (const id of ["custom_goods", "rental"]) {
      expect(
        groups.find((group) => group.id === id)!.items.find((item) => item.id === "photos")
          ?.optional,
      ).not.toBe(true);
    }
    for (const id of ["maintenance", "equipment"]) {
      expect(
        groups.find((group) => group.id === id)!.items.find((item) => item.id === "photos")
          ?.optional,
      ).toBe(true);
    }
    expect(
      groups.find((group) => group.id === "maintenance")!.items.find((item) => item.id === "photos")
        ?.label,
    ).toBe("รูปถ่ายหลังซ่อม (ถ้ามี)");
  });

  it.each(["cash", "credit"] as const)(
    "filters payment conditions and makes the chosen evidence non-exemptible: %s",
    (paymentCondition) => {
      const value = { ...createPol02Checklist(["office"]), paymentCondition };
      const items = getPol02ChecklistGroups(value)[1].items;
      expect(items.map(({ id }) => id)).toEqual([
        "pr",
        paymentCondition === "cash" ? "cash_receipt" : "credit_invoice",
      ]);
      expect(items.every((item) => !item.optional)).toBe(true);
    },
  );

  it("keeps both conditional evidence rows available for mixed/unspecified payments", () => {
    const items = getPol02ChecklistGroups(createPol02Checklist(["office"]))[1].items;
    expect(items.filter((item) => item.optional).map(({ id }) => id)).toEqual([
      "credit_invoice",
      "cash_receipt",
    ]);
  });

  it("clears stale answers after category, vendor and cash/credit changes without mutating input", () => {
    const value: Pol02Checklist = {
      ...createPol02Checklist(["office"]),
      paymentCondition: "cash",
      entries: {
        "office.pr": "checked",
        "office.cash_receipt": "not_applicable",
        "office.credit_invoice": "checked",
        "equipment.pr": "checked",
        "basic.vendor_documents": "checked",
        "basic.approved_project": "not_applicable",
      },
    };
    expect(reconcilePol02Checklist(value).entries).toEqual({
      "office.pr": "checked",
      "basic.approved_project": "not_applicable",
    });
    expect(value.entries["office.credit_invoice"]).toBe("checked");
  });

  it("starts all new claims unchecked and copies only category choices", () => {
    const categories = ["office"] as const;
    const value = createPol02Checklist(categories, true);
    expect(value.categories).toEqual(categories);
    expect(value.categories).not.toBe(categories);
    expect(value.entries).toEqual({});
    expect(getPol02ChecklistGroups(value)[0].items.map(({ id }) => id)).toEqual([
      "approved_project",
      "budget_change",
      "vendor_documents",
      "vendor_phone",
    ]);
    expect(getPol02DocumentIds(value)).toEqual([]);
  });

  it("maps checked answers to valid deduplicated legacy database IDs and exact print labels", () => {
    const value = createPol02Checklist(["office", "computer", "maintenance"]);
    value.entries = {
      "office.pr": "checked",
      "computer.pr": "checked",
      "office.credit_invoice": "checked",
      "office.cash_receipt": "not_applicable",
      "maintenance.photos": "checked",
    };
    expect(getPol02DocumentIds(value)).toEqual(["purchase_request", "delivery_invoice", "other"]);
    expect(
      getPol02DocumentIds(value).every((id) =>
        pol02DocumentChecklist.some((item) => item.id === id),
      ),
    ).toBe(true);
    expect(getPol02DocumentLabels(value)).toEqual([
      "ไฟล์รายงานขอซื้อขอจ้าง (PR)",
      "ใบกำกับภาษี/ใบส่งสินค้า (กรณีร้านค้าให้เครดิตกับคณะ)",
      "รูปถ่ายหลังซ่อม (ถ้ามี)",
    ]);
  });

  it.each([
    { categories: ["office", "office"] },
    { categories: ["invented"] },
    { paymentCondition: "loan" },
    { entries: { "basic.approved_project": "approved" } },
    { entries: { "office.pr": "not_applicable" } },
    { entries: { "equipment.pr": "checked" } },
    { entries: { "office.credit_invoice": "checked" }, paymentCondition: "cash" },
    { entries: { "office.cash_receipt": "not_applicable" }, paymentCondition: "cash" },
    { entries: { "basic.vendor_documents": "checked" }, newVendor: false },
    { staffApproved: true },
  ])("rejects unknown, hidden, duplicate or false approval data: %j", (overrides) => {
    expect(
      pol02SupportingChecklistSchema.safeParse({
        ...createPol02Checklist(["office"]),
        ...overrides,
      }).success,
    ).toBe(false);
  });

  it("round-trips all answered categories within the existing JSONB size limit", () => {
    const value = createPol02Checklist(
      POL02_CHECKLIST_CATEGORIES.map(({ id }) => id),
      true,
    );
    for (const group of getPol02ChecklistGroups(value))
      for (const item of group.items) value.entries[`${group.id}.${item.id}`] = "checked";
    const json = JSON.stringify(value);
    expect(Buffer.byteLength(json)).toBeLessThan(10000);
    expect(pol02SupportingChecklistSchema.parse(JSON.parse(json))).toEqual(value);
    expect(getPol02DocumentIds(value).length).toBeLessThanOrEqual(8);
  });

  it("renders named controls, status counts and the original file gate without asserting approval", () => {
    const value = createPol02Checklist(["office"]);
    value.entries = { "office.pr": "checked", "basic.approved_project": "not_applicable" };
    const html = renderToStaticMarkup(
      createElement(Pol02ChecklistFields, { value, disabled: true, onChange: () => {} }),
    );
    expect(html).toContain("เช็คลิสต์ใบขอเบิกจัดซื้อจัดจ้าง (POL-02)");
    expect(html).toContain("ตรวจแล้ว 1 / 5 รายการ");
    expect(html).toContain("ยกเลิกไม่เกี่ยวข้อง: เอกสารพื้นฐาน");
    expect(html).toContain("ไม่ใช่ผลตรวจหรืออนุมัติของเจ้าหน้าที่");
    expect(html).toContain('disabled=""');
    expect(html).toContain("อัปโหลดอย่างน้อย 1 ไฟล์");
  });
});
