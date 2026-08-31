import { z } from "zod";

export const paymentInputSchema = z
  .object({
    requestId: z.string().uuid(),
    idempotencyKey: z.string().uuid(),
    invoiceNo: z.string().trim().min(1).max(100),
    invoiceDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((value) => value <= new Date().toISOString().slice(0, 10)),
    subtotal: z.number().finite().nonnegative().max(999_999_999_999.99),
    vat: z.number().finite().nonnegative().max(999_999_999_999.99),
    delivery: z.string().trim().min(1).max(2_000),
  })
  .strict()
  .refine((input) => input.subtotal + input.vat > 0, {
    path: ["subtotal"],
    message: "payment total must be positive",
  });

export type PaymentInput = z.input<typeof paymentInputSchema>;
