import { describe, it, expect } from "vitest";
import {
  createTor,
  readTorDocuments,
  torDocumentsSchema,
  validateTorDocuments,
  TOR_HEADINGS,
} from "../../app/requests/tor/model";
import { parseRequestFormData } from "../../app/requests/new/schemas";

function complete() {
  const doc = createTor("office", "จัดซื้อวัสดุทดสอบ", "เหตุผลทดสอบ");
  doc.project = "โครงการทดสอบ";
  doc.sections = doc.sections.map((v) => v || "ข้อมูลทดสอบ");
  doc.authors[0] = { name: "ผู้ทดสอบ", position: "เจ้าหน้าที่" };
  return doc;
}
const base = {
  advanceFundingOption: "reimburse_after_purchase",
  vendor: null,
  budgetCodes: { departmentCode: "2301", fundCode: "2", activityCode: "123" },
  documentChecklist: { version: 1, categories: ["office"], entries: {} },
};
describe("POL-01 TOR per checklist category", () => {
  it("contains all 12 source sections and 3 independent unsigned authors", () => {
    const doc = createTor("office");
    expect(TOR_HEADINGS).toHaveLength(12);
    expect(doc.sections).toHaveLength(12);
    expect(doc.project).toBe("");
    expect(doc.authors).toHaveLength(3);
    expect(doc.authors[0]).not.toBe(doc.authors[1]);
    expect(doc.sections[8]).toContain("0.10");
  });
  it("preserves old requests without TOR", () => {
    expect(readTorDocuments(undefined)).toEqual([]);
    expect(parseRequestFormData(base).success).toBe(true);
    expect(validateTorDocuments([], [])).toBe("");
  });
  it("keeps independent documents and UUID attachment identity", () => {
    const first = complete(),
      second = createTor("equipment");
    expect(first.attachmentId).not.toBe(second.attachmentId);
    expect(torDocumentsSchema.safeParse([first, second]).success).toBe(true);
    expect(readTorDocuments(JSON.parse(JSON.stringify([first])))).toEqual([first]);
  });
  it("does not silently discard corrupt persisted TOR", () =>
    expect(() => readTorDocuments([{ version: 99 }])).toThrow());
  it("rejects duplicate categories and duplicate attachment ids", () => {
    const first = complete();
    expect(
      torDocumentsSchema.safeParse([first, { ...first, attachmentId: crypto.randomUUID() }])
        .success,
    ).toBe(false);
    expect(torDocumentsSchema.safeParse([first, { ...first, category: "equipment" }]).success).toBe(
      false,
    );
  });
  it("blocks incomplete TOR only when the requester opts in", () => {
    expect(validateTorDocuments([createTor("office")], ["office"])).toContain("กรอก TOR");
    expect(validateTorDocuments([complete()], ["office"])).toBe("");
  });
  it("rejects deselected categories on client and server", () => {
    expect(validateTorDocuments([complete()], [])).toContain("เช็คลิสต์");
    expect(
      parseRequestFormData({
        ...base,
        documentChecklist: { ...base.documentChecklist, categories: [] },
        torDocuments: [complete()],
      }).success,
    ).toBe(false);
  });
  it("persists structured TOR without automatically checking the checklist", () => {
    const result = parseRequestFormData({ ...base, torDocuments: [complete()] });
    expect(result.success).toBe(true);
    if (result.success && result.data.formType === "standard") {
      expect(result.data.torDocuments).toHaveLength(1);
      expect(result.data.documentChecklist?.entries).toEqual({});
    }
  });
  it("bounds documents, fields and rejects path traversal", () => {
    expect(
      torDocumentsSchema.safeParse([{ ...complete(), attachmentId: "../manual.pdf" }]).success,
    ).toBe(false);
    const long = complete();
    long.sections[0] = "ก".repeat(5001);
    expect(torDocumentsSchema.safeParse([long]).success).toBe(false);
    expect(torDocumentsSchema.safeParse(Array.from({ length: 11 }, complete)).success).toBe(false);
  });
  it("retains removal tombstones across save/reload retries", () => {
    const id = crypto.randomUUID();
    const result = parseRequestFormData({
      ...base,
      torDocuments: [],
      removedTorAttachmentIds: [id],
    });
    expect(
      result.success && result.data.formType === "standard" && result.data.removedTorAttachmentIds,
    ).toEqual([id]);
  });
});
