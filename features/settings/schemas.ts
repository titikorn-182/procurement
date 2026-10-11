import { z } from "zod";

const boundedText = z.string().trim().min(1).max(200);

export const appRoleSchema = z.enum([
  "user",
  "procurement_staff",
  "finance_staff",
  "head_procurement",
  "deputy_secretary",
  "deputy_finance",
  "dean",
  "head_office",
  "admin",
]);

export const userSettingsUpdateSchema = z
  .object({
    userId: z.string().uuid(),
    fullName: z.string().trim().min(2).max(200),
    positionTitle: z.string().trim().max(200),
    role: appRoleSchema,
    departmentId: z.union([z.literal(""), z.string().uuid()]),
  })
  .strict();

export const settingSchemas = {
  workflow: z
    .object({
      approval_limit: z.number().finite().nonnegative().max(999_999_999_999.99),
      require_head_procurement: z.boolean(),
    })
    .strict(),
  budget: z
    .object({
      fiscal_year: z.number().int().min(2500).max(2700),
      default_fund: boundedText,
    })
    .strict(),
  documents: z
    .object({
      purchase_prefix: z
        .string()
        .trim()
        .min(1)
        .max(20)
        .regex(/^[A-Za-z0-9_-]+$/),
      payment_prefix: z
        .string()
        .trim()
        .min(1)
        .max(20)
        .regex(/^[A-Za-z0-9_-]+$/),
    })
    .strict(),
  notifications: z
    .object({
      in_app: z.boolean(),
      email: z.boolean(),
      line: z.boolean(),
    })
    .strict(),
  sla: z
    .object({
      review_days: z.number().int().min(0).max(365),
      approval_days: z.number().int().min(0).max(365),
      business_days_only: z.boolean(),
    })
    .strict(),
  integrations: z
    .object({
      sso: boundedText,
      budget: boundedText,
      digital_signature: boundedText,
    })
    .strict(),
} satisfies Record<string, z.ZodType<Record<string, unknown>>>;

export type SettingKey = keyof typeof settingSchemas;

export function isSettingKey(value: string): value is SettingKey {
  return Object.hasOwn(settingSchemas, value);
}
