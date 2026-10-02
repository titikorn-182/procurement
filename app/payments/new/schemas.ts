import { z } from "zod";

const requiredText = (maximum: number) => z.string().trim().min(1).max(maximum);
const optionalText = (maximum: number) => z.string().trim().max(maximum);
const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const pastOrPresentIsoDate = isoDate.refine(
  (value) => value <= new Date().toISOString().slice(0, 10),
);

const paymentLineSchema = z
  .object({
    lineNo: z.number().int().positive().max(100),
    description: requiredText(500),
    attachmentType: requiredText(100),
    documentNo: optionalText(100),
    quantity: z.number().finite().positive().max(999_999_999),
    unitPrice: z.number().finite().nonnegative().max(999_999_999_999.99),
  })
  .strict()
  .refine((item) => item.quantity * item.unitPrice <= 999_999_999_999.99, {
    path: ["unitPrice"],
    message: "payment line amount is too large",
  });

const pol02FormSchema = z
  .object({
    formType: z.literal("pol02"),
    formVersion: z.literal(1),
    approvalDate: pastOrPresentIsoDate,
    departmentName: requiredText(300),
    requesterName: requiredText(300),
    subject: requiredText(500),
    projectActivity: optionalText(300),
    budgetYear: z.number().int().min(2500).max(2700),
    fundSource: requiredText(200),
    departmentCode: optionalText(50),
    fundCode: optionalText(50),
    activityCode: optionalText(50),
    expenseCategory: optionalText(200),
    procurementMethod: requiredText(200),
    egpProjectNo: optionalText(100),
    contractNo: optionalText(100),
    contractDate: z.union([pastOrPresentIsoDate, z.literal("")]),
    vendorName: requiredText(300),
    vendorTaxId: optionalText(20),
    contractAmount: z.number().finite().positive().max(999_999_999_999.99),
    installmentNumber: z.number().int().positive().max(999),
    installmentCount: z.number().int().positive().max(999),
    documentChecklist: z.array(z.string().trim().min(1).max(100)).min(1).max(20),
  })
  .strict()
  .refine((data) => data.installmentNumber <= data.installmentCount, {
    path: ["installmentNumber"],
    message: "installment number exceeds installment count",
  });

export const paymentInputSchema = z
  .object({
    requestId: z.string().uuid(),
    idempotencyKey: z.string().uuid(),
    invoiceNo: requiredText(100),
    invoiceDate: pastOrPresentIsoDate,
    subtotal: z.number().finite().nonnegative().max(999_999_999_999.99),
    vat: z.number().finite().nonnegative().max(999_999_999_999.99),
    delivery: requiredText(2_000),
    formData: pol02FormSchema,
    items: z.array(paymentLineSchema).min(1).max(100),
  })
  .strict()
  .refine((input) => input.subtotal + input.vat > 0, {
    path: ["subtotal"],
    message: "payment total must be positive",
  })
  .superRefine((input, context) => {
    const itemTotal = input.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    if (Math.abs(itemTotal - input.subtotal) > 0.009) {
      context.addIssue({
        code: "custom",
        path: ["items"],
        message: "payment items must equal subtotal",
      });
    }
  });

export type PaymentInput = z.input<typeof paymentInputSchema>;
