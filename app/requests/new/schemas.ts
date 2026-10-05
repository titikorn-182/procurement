import { z } from "zod";

const isoDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((value) => !Number.isNaN(Date.parse(`${value}T00:00:00Z`)));

const nonPastIsoDateSchema = isoDateSchema.refine(
  (value) => value >= new Date().toISOString().slice(0, 10),
);

const shortRequiredText = (maximum: number) => z.string().trim().min(1).max(maximum);

export const requestItemSchema = z
  .object({
    line_no: z.number().int().positive().max(1_000),
    description: shortRequiredText(500),
    quantity: z.number().finite().positive().max(999_999_999),
    unit: shortRequiredText(100),
    unit_price: z.number().finite().nonnegative().max(999_999_999_999.99),
    market_price: z.number().finite().nonnegative().max(999_999_999_999.99).optional(),
    price_source: z.string().trim().max(500).optional(),
  })
  .strict();

export const newRequestInputSchema = z
  .object({
    kind: z.enum(["purchase", "hire"]),
    title: z.string().trim().min(3).max(300),
    rationale: z.string().trim().min(3).max(5_000),
    requiredDate: nonPastIsoDateSchema,
    budgetYear: z.number().int().min(2500).max(2700),
    fundSource: shortRequiredText(200),
    planName: z.string().trim().max(300),
    expenseCategory: z.string().trim().max(200),
    formData: z.unknown(),
    items: z.array(requestItemSchema).min(1).max(200),
  })
  .strict()
  .superRefine((input, context) => {
    const lineNumbers = new Set(input.items.map((item) => item.line_no));
    if (lineNumbers.size !== input.items.length) {
      context.addIssue({ code: "custom", path: ["items"], message: "duplicate line number" });
    }
  });

const budgetCodeSchema = shortRequiredText(50);

const registeredVendorSchema = z
  .object({
    type: z.literal("registered"),
    id: z.string().trim().min(1).max(200),
    name: z.string().nullable().optional(),
  })
  .strict();

const newVendorSchema = z
  .object({
    type: z.literal("new"),
    id: z.null().optional(),
    name: shortRequiredText(200).refine((value) => !/[\u0000-\u001f\u007f]/.test(value)),
  })
  .strict();

export const standardRequestFormSchema = z
  .object({
    advanceFundingOption: z.enum([
      "borrow_before_purchase",
      "reimburse_after_purchase",
      "faculty_direct_pay_credit_vendor",
    ]),
    requiresLoanAgreement: z.boolean().optional(),
    vendor: z.union([registeredVendorSchema, newVendorSchema]).nullable(),
    requiresVendorDocuments: z.boolean().optional(),
    budgetCodes: z
      .object({
        departmentCode: budgetCodeSchema,
        fundCode: budgetCodeSchema,
        activityCode: budgetCodeSchema,
      })
      .strict(),
  })
  .strict()
  .superRefine((data, context) => {
    if (data.advanceFundingOption === "faculty_direct_pay_credit_vendor" && !data.vendor) {
      context.addIssue({ code: "custom", path: ["vendor"], message: "vendor is required" });
    }
  })
  .transform((data) => ({
    formType: "standard" as const,
    formVersion: 1 as const,
    ...data,
    requiresLoanAgreement: data.advanceFundingOption === "borrow_before_purchase",
    requiresVendorDocuments: data.vendor?.type === "new",
  }));

export const w119RequestFormSchema = z
  .object({
    regulation: shortRequiredText(300),
    documentNo: shortRequiredText(100),
    memoDate: isoDateSchema,
    departmentName: shortRequiredText(300),
    phone: shortRequiredText(50),
    addressee: shortRequiredText(300),
    selectionCriteria: z.enum(["เกณฑ์ราคา", "เกณฑ์ราคาประกอบเกณฑ์อื่น"]),
    advanceRequired: z.boolean(),
    inspectors: z.array(shortRequiredText(200)).max(3).optional(),
    budgetCodes: z
      .object({
        sourceCode: budgetCodeSchema,
        departmentCode: budgetCodeSchema,
        fundCode: budgetCodeSchema,
        planCode: budgetCodeSchema,
        subprojectCode: budgetCodeSchema,
        activityCode: budgetCodeSchema,
      })
      .strict(),
    requiresItemAttachment: z.boolean(),
  })
  .strict()
  .transform(({ inspectors, ...data }) => {
    // Accept legacy records but do not carry proposed inspectors into new or resubmitted W119 data.
    void inspectors;
    return { formType: "w119" as const, formVersion: 1 as const, ...data };
  });

export function parseRequestFormData(value: unknown) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { success: false as const };
  }

  if ("regulation" in value) {
    const parsed = w119RequestFormSchema.safeParse(value);
    return parsed.success
      ? { success: true as const, data: parsed.data }
      : { success: false as const };
  }

  const parsed = standardRequestFormSchema.safeParse(value);
  return parsed.success
    ? { success: true as const, data: parsed.data }
    : { success: false as const };
}

export type NewRequestInput = z.input<typeof newRequestInputSchema>;
