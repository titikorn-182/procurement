import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("../../app/components/app-shell", () => ({
  AppShell: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("../../app/requests/new/actions", () => ({
  createRequestDraft: vi.fn(),
  submitRequestDraft: vi.fn(),
}));
vi.mock("../../app/lib/request-attachments.client", () => ({
  uploadRequestAttachments: vi.fn(),
}));
vi.mock("../../app/requests/new/vendor-picker", () => ({
  VendorPicker: () => null,
}));

import NewRequestPage from "../../app/requests/new/page";

describe("POL-01 new request defaults", () => {
  it("starts the title and rationale blank without sample text or placeholders", () => {
    const html = renderToStaticMarkup(createElement(NewRequestPage));
    const fields = Array.from(html.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/g));
    const title = fields.find((match) => match[1].includes(">ชื่อเรื่องคำขอ *</span>"))?.[1];
    const rationale = fields.find((match) =>
      match[1].includes(">เหตุผลและความจำเป็น *</span>"),
    )?.[1];
    expect(title).toContain('value=""');
    expect(rationale).toMatch(/<textarea[^>]*><\/textarea>/);
    expect(title).not.toContain("placeholder=");
    expect(rationale).not.toContain("placeholder=");
    expect(html).not.toContain("จัดซื้อวัสดุสำนักงานประจำปีงบประมาณ 2569");
    expect(html).not.toContain("เพื่อสนับสนุนการปฏิบัติงานของหน่วยงานให้เป็นไปอย่างต่อเนื่อง");
  });
});
