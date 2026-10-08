import { z } from "zod";
import {
  POL02_CHECKLIST_CATEGORIES,
  getPol02ChecklistGroups,
  reconcilePol02Checklist,
} from "./pol02-checklist";

export const pol02SupportingChecklistSchema = z
  .object({
    version: z.literal(1),
    categories: z
      .array(z.enum(POL02_CHECKLIST_CATEGORIES.map(({ id }) => id)))
      .max(POL02_CHECKLIST_CATEGORIES.length)
      .refine((values) => new Set(values).size === values.length, "duplicate checklist category"),
    paymentCondition: z.enum(["all", "cash", "credit"]),
    newVendor: z.boolean(),
    entries: z.record(z.string().max(80), z.enum(["checked", "not_applicable"])),
  })
  .strict()
  .superRefine((value, context) => {
    const allowed = new Map<string, { optional?: boolean }>(
      getPol02ChecklistGroups(value).flatMap((group) =>
        group.items.map((item) => [`${group.id}.${item.id}`, item] as const),
      ),
    );
    for (const [key, status] of Object.entries(value.entries)) {
      const item = allowed.get(key);
      if (!item || (status === "not_applicable" && !item.optional))
        context.addIssue({
          code: "custom",
          path: ["entries", key],
          message: "invalid checklist answer",
        });
    }
  })
  .transform(reconcilePol02Checklist);
