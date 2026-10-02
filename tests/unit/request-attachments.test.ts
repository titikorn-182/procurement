import { describe, expect, it } from "vitest";
import {
  formatAttachmentSize,
  paymentAttachmentPath,
  requestAttachmentPath,
  resolveAttachmentMimeType,
  validateAttachmentCandidates,
} from "../../app/lib/request-attachments";

describe("request attachment validation", () => {
  it("accepts the supported document formats", () => {
    expect(
      resolveAttachmentMimeType({ name: "quote.PDF", size: 10, type: "application/pdf" }),
    ).toBe("application/pdf");
    expect(resolveAttachmentMimeType({ name: "price.xlsx", size: 10, type: "" })).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
  });

  it("rejects spoofed, oversized, and excessive files", () => {
    expect(
      validateAttachmentCandidates([{ name: "quote.pdf", size: 10, type: "image/png" }]),
    ).toContain("ไม่รองรับ");
    expect(
      validateAttachmentCandidates([
        { name: "quote.pdf", size: 21 * 1024 * 1024, type: "application/pdf" },
      ]),
    ).toContain("20 MB");
    expect(
      validateAttachmentCandidates(
        Array.from({ length: 11 }, (_, index) => ({
          name: `${index}.pdf`,
          size: 1,
          type: "application/pdf",
        })),
      ),
    ).toContain("10 ไฟล์");
    expect(
      validateAttachmentCandidates([{ name: "empty.pdf", size: 0, type: "application/pdf" }]),
    ).toContain("ไม่มีข้อมูล");
  });

  it("creates an opaque storage path without the original file name", () => {
    const path = requestAttachmentPath("11111111-1111-4111-8111-111111111111", {
      id: "22222222-2222-4222-8222-222222222222",
      file: { name: "ข้อมูลลับ.pdf" } as File,
    });
    expect(path).toBe(
      "requests/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.pdf",
    );
    expect(path).not.toContain("ข้อมูลลับ");
    expect(formatAttachmentSize(1_572_864)).toContain("1.5");

    const paymentPath = paymentAttachmentPath("11111111-1111-4111-8111-111111111111", {
      id: "22222222-2222-4222-8222-222222222222",
      file: { name: "invoice.pdf" } as File,
    });
    expect(paymentPath).toBe(
      "payments/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222.pdf",
    );
  });
});
