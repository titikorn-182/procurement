import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PaymentPrintPreview } from "../../app/payments/new/payment-print-preview";
import { createPol02PrintData } from "../../app/payments/new/pol02-print-data";
import { createPol02Fixture } from "../fixtures/pol02-print";
import type { PaymentFormFiles } from "../../app/payments/new/types";

function renderPreview(attachments: PaymentFormFiles = []) {
  return renderToStaticMarkup(
    createElement(PaymentPrintPreview, {
      data: createPol02PrintData({
        ...createPol02Fixture(),
        attachmentNames: attachments.map(({ file }) => file.name),
      }),
      fontClassName: "print-font",
      onClose: () => undefined,
      attachments,
    }),
  );
}

describe("POL-02 PDF bundle controls", () => {
  it("offers a combined PDF with the exact selected attachment count", () => {
    const attachments = [
      {
        id: "11111111-1111-4111-8111-111111111111",
        file: new File(["sample"], "ใบแจ้งหนี้.pdf", { type: "application/pdf" }),
      },
      {
        id: "22222222-2222-4222-8222-222222222222",
        file: new File(["sample"], "หลักฐาน.png", { type: "image/png" }),
      },
    ];
    const html = renderPreview(attachments);
    expect(html).toContain("ดาวน์โหลด PDF รวมเอกสารแนบ");
    expect(html).toContain("เอกสารแนบ 2 ไฟล์");
    expect(html).toContain("ดาวน์โหลดเฉพาะแบบฟอร์ม");
    expect(html).toContain("พิมพ์แบบฟอร์ม");
    expect(html).toContain("จะไม่บันทึกหรือส่งคำขอเข้าสายอนุมัติ");
    expect(attachments[0].file.name).toBe("ใบแจ้งหนี้.pdf");
  });

  it("keeps the form-only download when no attachments are selected", () => {
    const html = renderPreview();
    expect(html).toContain("ดาวน์โหลด PDF");
    expect(html).not.toContain("ดาวน์โหลด PDF รวมเอกสารแนบ");
    expect(html).not.toContain("ดาวน์โหลดเฉพาะแบบฟอร์ม");
  });

  it("includes unsupported selections in the count instead of silently omitting them", () => {
    const html = renderPreview([
      {
        id: "11111111-1111-4111-8111-111111111111",
        file: new File(["sample"], "เอกสาร.docx"),
      },
    ]);
    expect(html).toContain("เอกสารแนบ 1 ไฟล์");
    expect(html).toContain("Word/Excel ต้องแปลงเป็น PDF ก่อนรวม");
    expect(html).toContain("ดาวน์โหลดเฉพาะแบบฟอร์ม");
  });
});
