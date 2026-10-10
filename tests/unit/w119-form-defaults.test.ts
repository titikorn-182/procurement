import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import type { ReturnedW119RequestEditData } from "../../app/requests/[id]/edit/types";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../../app/components/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../../app/requests/new/actions", () => ({
  createRequestDraft: vi.fn(),
  submitRequestDraft: vi.fn(),
}));
vi.mock("../../app/requests/[id]/edit/actions", () => ({
  updateReturnedRequest: vi.fn(),
  resubmitReturnedRequest: vi.fn(),
}));
vi.mock("../../app/requests/[id]/edit/attachment-actions", () => ({
  removeReturnedW119Attachments: vi.fn(),
}));
vi.mock("../../app/lib/request-attachments.client", () => ({
  uploadRequestAttachments: vi.fn(),
}));

import { W119Form } from "../../app/requests/w119/w119-form";

function fieldMarkup(html: string, label: string) {
  const fields = Array.from(html.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/g));
  const field = fields.find((match) => match[1].includes(`>${label}</span>`));
  expect(field, `Missing field: ${label}`).toBeDefined();
  return field![1];
}

describe("W119 form defaults", () => {
  it("uses the rector as addressee, leaves title and rationale empty, and keeps the memo-date field", () => {
    const html = renderToStaticMarkup(createElement(W119Form, { printFontClassName: "psk" }));
    expect(fieldMarkup(html, "เรียน *")).toContain('value="อธิการบดีมหาวิทยาลัยอุบลราชธานี"');
    expect(fieldMarkup(html, "เรื่อง ขอซื้อ/จ้าง *")).toContain('value=""');
    expect(fieldMarkup(html, "ความประสงค์ วัตถุประสงค์ และเหตุผลความจำเป็น *")).toMatch(
      /<textarea[^>]*><\/textarea>/,
    );
    expect(fieldMarkup(html, "วันที่บันทึก *")).toContain('type="date"');
    expect(html).not.toContain("จัดซื้อวัสดุสำนักงานประจำปีงบประมาณ 2569");
    expect(html).not.toContain("เพื่อสนับสนุนการปฏิบัติงานของหน่วยงานให้เป็นไปอย่างต่อเนื่อง");
  });

  it("preserves saved addressee, title, rationale and memo date when editing a returned request", () => {
    const initial: ReturnedW119RequestEditData = {
      formType: "w119",
      id: "test-only",
      requestNo: "TEST-W119",
      currentStep: 2,
      kind: "purchase",
      title: "เรื่องที่ผู้ขอกรอกไว้",
      rationale: "เหตุผลที่ผู้ขอกรอกไว้",
      requiredDate: "2026-10-20",
      budgetYear: 2570,
      fundSource: "เงินรายได้",
      planName: "แผนทดสอบ",
      expenseCategory: "ค่าวัสดุ",
      attachments: [],
      returnReason: "แก้ไข",
      items: [],
      formData: {
        regulation: "ว119",
        documentNo: "อว ทดสอบ",
        memoDate: "2026-10-10",
        departmentName: "ส่วนงานทดสอบ",
        phone: "1234",
        addressee: "ผู้รับบันทึกเดิม",
        selectionCriteria: "เกณฑ์ราคา",
        advanceRequired: false,
        budgetCodes: {
          sourceCode: "2",
          departmentCode: "2301",
          fundCode: "2",
          planCode: "1",
          subprojectCode: "1",
          activityCode: "1",
        },
      },
    };
    const html = renderToStaticMarkup(
      createElement(W119Form, { printFontClassName: "psk", initial }),
    );
    expect(fieldMarkup(html, "เรียน *")).toContain('value="ผู้รับบันทึกเดิม"');
    expect(fieldMarkup(html, "เรื่อง ขอซื้อ/จ้าง *")).toContain('value="เรื่องที่ผู้ขอกรอกไว้"');
    expect(fieldMarkup(html, "ความประสงค์ วัตถุประสงค์ และเหตุผลความจำเป็น *")).toContain(
      ">เหตุผลที่ผู้ขอกรอกไว้</textarea>",
    );
    expect(fieldMarkup(html, "วันที่บันทึก *")).toContain('value="2026-10-10"');
  });
});
