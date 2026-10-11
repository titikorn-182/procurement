import { describe, expect, it } from "vitest";
import {
  createSection79Draft,
  documentErrors,
  MAX_DRAFT_BYTES,
  parseSection79Draft,
  SECTION79_LIMIT,
  SECTION79_SUBJECT,
  SECTION79_TITLE,
  section79DraftSchema,
  section79StepErrors,
  SIGNATORY_ROLES,
} from "../../app/requests/section79/model";

function completeDraft() {
  const data = createSection79Draft("2570");
  data.memoDate = "2026-10-11";
  data.description = "วัสดุซ่อมแซมอุปกรณ์เพื่อการเรียนการสอน";
  data.requester = { name: "ผู้จัดทำทดสอบ", position: "เจ้าหน้าที่ทดสอบ" };
  data.vendor = "ผู้ประกอบการทดสอบ";
  data.receipt = { kind: "receipt", book: "", number: "001", date: "2026-10-10" };
  data.urgentReason = "มีเหตุขัดข้องกะทันหัน ไม่อาจดำเนินการตามปกติได้ทัน";
  data.amount = 1250.5;
  data.payee = "ผู้รับเงินทดสอบ";
  data.budget = {
    fiscalYear: "2570",
    source: "งบประมาณเงินรายได้",
    fund: "กองทุนทดสอบ",
    activity: "กิจกรรมทดสอบ",
    project: "โครงการทดสอบ",
    sourceCode: "02",
    departmentCode: "02301",
    fundCode: "06",
    activityCode: "000123",
  };
  return data;
}

describe("Section 79 paragraph 2 document-only draft model", () => {
  it("starts with faculty identity, no personal names, transaction values or decisions", () => {
    const data = createSection79Draft("2570");
    expect(section79DraftSchema.safeParse(data).success).toBe(true);
    expect(data).toMatchObject({
      format: "ubu-pol-section79",
      version: 1,
      department: "สำนักงานเลขานุการ คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี",
      phone: "3944",
      memoNumber: "อว 0604.19/",
      memoDate: "",
      subject: SECTION79_SUBJECT,
      amount: null,
      description: "",
      requester: { name: "", position: "" },
      vendor: "",
      payee: "",
      urgentReason: "",
      budget: { fiscalYear: "2570", source: "", sourceCode: "", activityCode: "" },
    });
    expect(data.addressee).toContain("อธิการบดีมหาวิทยาลัยอุบลราชธานี");
    expect(SECTION79_TITLE).toBe("คำขอซื้อ/จ้าง ข้อ 79 วรรค 2");
    expect(data.signatories).toHaveLength(6);
    expect(data.signatories.every((person) => person.name === "")).toBe(true);
    expect(SIGNATORY_ROLES).toHaveLength(6);
    expect(data).not.toHaveProperty("status");
    expect(documentErrors(data).length).toBeGreaterThan(0);
  });

  it("accepts incomplete drafts for saving but gates document preparation by stage", () => {
    const blank = createSection79Draft("");
    expect(parseSection79Draft(JSON.stringify(blank))).toEqual(blank);
    expect(section79StepErrors(blank, 0).join()).toContain("เหตุจำเป็นเร่งด่วน");
    expect(section79StepErrors(blank, 0).join()).not.toContain("จำนวนเงิน");
    expect(section79StepErrors(blank, 1).join()).toContain("จำนวนเงิน");
    expect(section79StepErrors(blank, 1).join()).toContain("ปีงบประมาณ");
    expect(section79StepErrors(blank, 1).join()).not.toContain("เหตุจำเป็นเร่งด่วน");
    expect(section79StepErrors(blank, 2)).toEqual([]);
  });

  it("validates a complete purchase and hire with optional receipt book, codes and signers", () => {
    const data = completeDraft();
    data.budget.sourceCode = "";
    data.budget.departmentCode = "";
    data.budget.fundCode = "";
    data.budget.activityCode = "";
    expect(documentErrors(data)).toEqual([]);
    expect(section79StepErrors(data, 0)).toEqual([]);
    expect(section79StepErrors(data, 1)).toEqual([]);
    expect(section79StepErrors(data, 2)).toEqual([]);
    data.kind = "hire";
    data.receipt.kind = "delivery";
    expect(documentErrors(data)).toEqual([]);
  });

  it("round-trips strings and leading zero codes, stripping injected approval metadata", () => {
    const data = completeDraft();
    const restored = parseSection79Draft(
      JSON.stringify({
        ...data,
        status: "approved",
        owner_id: "someone-else",
        signatories: data.signatories.map((person) => ({ ...person, decision: "approved" })),
      }),
    );
    expect(restored).toEqual(data);
    expect(restored.budget.activityCode).toBe("000123");
    expect(restored.budget.departmentCode).toBe("02301");
    expect(restored).not.toHaveProperty("status");
    expect(restored.signatories[0]).not.toHaveProperty("decision");
  });

  it.each([0.01, 1.1, 1250.5, 499999.99, SECTION79_LIMIT])(
    "accepts exact satang values within the source template limit: %s",
    (amount) => {
      expect(documentErrors({ ...completeDraft(), amount })).toEqual([]);
    },
  );

  it.each([-1, Infinity, NaN, 1.001, 500000.01])("rejects invalid financial data: %s", (amount) => {
    const data = { ...completeDraft(), amount };
    expect(section79DraftSchema.safeParse(data).success).toBe(false);
    expect(documentErrors(data)).toHaveLength(1);
  });

  it.each([null, 0])("permits %s only for an incomplete financial draft", (amount) => {
    const data = { ...completeDraft(), amount };
    expect(section79DraftSchema.safeParse(data).success).toBe(true);
    expect(documentErrors(data).join()).toContain("จำนวนเงินมากกว่า 0");
  });

  it.each(["2026-02-29", "2026-02-30", "2026-13-01", "2026-1-01", "2569-02-29"])(
    "rejects impossible or non-ISO dates: %s",
    (date) => {
      expect(section79DraftSchema.safeParse({ ...completeDraft(), memoDate: date }).success).toBe(
        false,
      );
      const data = completeDraft();
      data.receipt.date = date;
      expect(section79DraftSchema.safeParse(data).success).toBe(false);
    },
  );

  it("accepts real leap dates and rejects receipts later than the memo", () => {
    const data = completeDraft();
    data.memoDate = "2028-02-29";
    data.receipt.date = "2028-02-29";
    expect(documentErrors(data)).toEqual([]);
    data.receipt.date = "2028-03-01";
    expect(section79DraftSchema.safeParse(data).success).toBe(true);
    expect(section79StepErrors(data, 0).join()).toContain("ต้องไม่อยู่หลังวันที่บันทึกข้อความ");
    expect(documentErrors(data).join()).toContain("ต้องไม่อยู่หลังวันที่บันทึกข้อความ");
  });

  it("rejects wrong forms, versions, type coercion and incorrect signature counts", () => {
    const data = completeDraft();
    for (const invalid of [
      { ...data, format: "ubu-pol-w804" },
      { ...data, version: 2 },
      { ...data, amount: "100.00" },
      { ...data, kind: "other" },
      { ...data, budget: { ...data.budget, sourceCode: 2 } },
      { ...data, budget: { ...data.budget, sourceCode: "1".repeat(31) } },
      { ...data, budget: { ...data.budget, fiscalYear: "2026" } },
      { ...data, signatories: data.signatories.slice(1) },
      { ...data, signatories: [...data.signatories, data.signatories[0]] },
      { ...data, urgentReason: "ก".repeat(5001) },
      { ...data, subject: "ก".repeat(501) },
    ]) {
      expect(() => parseSection79Draft(JSON.stringify(invalid))).toThrow();
    }
  });

  it("checks actual UTF-8 bytes before parsing and handles corrupt JSON", () => {
    expect(MAX_DRAFT_BYTES).toBe(250 * 1024);
    expect(() => parseSection79Draft("invalid-json")).toThrow("JSON");
    expect(() => parseSection79Draft(" ".repeat(MAX_DRAFT_BYTES + 1))).toThrow("250 KB");
    expect(() => parseSection79Draft("ก".repeat(Math.floor(MAX_DRAFT_BYTES / 3) + 1))).toThrow(
      "250 KB",
    );
    const json = JSON.stringify(createSection79Draft("2570"));
    const bytes = new TextEncoder().encode(json).byteLength;
    expect(parseSection79Draft(json + " ".repeat(MAX_DRAFT_BYTES - bytes))).toEqual(
      createSection79Draft("2570"),
    );
  });

  it("treats whitespace-only required fields as incomplete", () => {
    const data = completeDraft();
    data.vendor = "   ";
    data.budget.project = "\t";
    expect(documentErrors(data).join()).toContain("ผู้ประกอบการ/ร้านค้า");
    expect(documentErrors(data).join()).toContain("โครงการ");
  });

  it("keeps invalid budget data on the budget step with actionable Thai errors", () => {
    const data = completeDraft();
    data.amount = 500000.01;
    expect(section79StepErrors(data, 0)).toEqual([]);
    expect(section79StepErrors(data, 2)).toEqual([]);
    expect(section79StepErrors(data, 1)).toEqual([
      "จำนวนเงินต้องไม่เกิน 500,000 บาทตามแบบฟอร์มที่แนบ",
    ]);
    expect(documentErrors(data)).toEqual(section79StepErrors(data, 1));
    data.amount = 1.001;
    expect(section79StepErrors(data, 1)).toEqual(["จำนวนเงินต้องมีทศนิยมไม่เกิน 2 ตำแหน่ง"]);
    data.amount = -1;
    expect(section79StepErrors(data, 1)).toEqual(["จำนวนเงินต้องไม่ติดลบ"]);
    data.amount = NaN;
    expect(section79StepErrors(data, 1)).toEqual(["จำนวนเงินต้องเป็นตัวเลขที่ถูกต้อง"]);
  });

  it("isolates schema errors to their own stage and labels the affected field", () => {
    const data = completeDraft();
    data.memoDate = "2026-02-30";
    data.subject = "ก".repeat(501);
    expect(section79StepErrors(data, 0).join()).toContain(
      "วันที่บันทึกข้อความต้องเป็นวันที่มีอยู่จริง",
    );
    expect(section79StepErrors(data, 0).join()).toContain("เรื่องต้องไม่เกิน 500 ตัวอักษร");
    expect(section79StepErrors(data, 1)).toEqual([]);
    expect(section79StepErrors(data, 2)).toEqual([]);
    data.budget.fiscalYear = "2026";
    expect(section79StepErrors(data, 1).join()).toContain("ปีงบประมาณต้องเป็น พ.ศ. 4 หลัก");
    data.signatories[0].position = "ก".repeat(501);
    expect(section79StepErrors(data, 2)).toEqual([
      "ตำแหน่งผู้ลงนาม ส่วนที่ 1 ต้องไม่เกิน 500 ตัวอักษร",
    ]);
    expect(documentErrors(data)).toHaveLength(4);
  });
});
