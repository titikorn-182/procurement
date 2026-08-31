import { describe, expect, it } from "vitest";
import { paymentInputSchema } from "../../app/payments/new/schemas";

const validPayment = {
  requestId: "550e8400-e29b-41d4-a716-446655440000",
  idempotencyKey: "6ba7b810-9dad-41d1-80b4-00c04fd430c8",
  invoiceNo: "INV-001",
  invoiceDate: "2026-08-30",
  subtotal: 1_000,
  vat: 70,
  delivery: "ตรวจรับเรียบร้อย",
};

describe("paymentInputSchema", () => {
  it("accepts a valid payment", () => {
    expect(paymentInputSchema.safeParse(validPayment).success).toBe(true);
  });

  it("rejects malformed UUIDs and a zero total", () => {
    expect(
      paymentInputSchema.safeParse({
        ...validPayment,
        requestId: "not-a-uuid",
        subtotal: 0,
        vat: 0,
      }).success,
    ).toBe(false);
  });
});
