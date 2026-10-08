import { z } from "zod";
import {
  POL01_CHECKLIST_CATEGORIES,
  checklistEntryKey,
  createPol01Checklist,
  getPol01ChecklistGroups,
  reconcilePol01Checklist,
  type Pol01ChecklistContext,
} from "./pol01-checklist";

const categoryIds = POL01_CHECKLIST_CATEGORIES.map((category) => category.id);
const allowedItems = new Map(
  getPol01ChecklistGroups(categoryIds, { newVendor: true, borrowing: true }).flatMap((group) =>
    group.items.map((item) => [checklistEntryKey(group.id, item.id), item] as const),
  ),
);

export const pol01ChecklistSchema = z
  .object({
    version: z.literal(1),
    categories: z
      .array(z.enum(categoryIds))
      .max(categoryIds.length)
      .refine((values) => new Set(values).size === values.length, "duplicate checklist category"),
    entries: z.record(z.string().max(80), z.enum(["checked", "not_applicable"])),
  })
  .strict()
  .superRefine((value, context) => {
    for (const [key, status] of Object.entries(value.entries)) {
      const item = allowedItems.get(key);
      if (!item || (status === "not_applicable" && !item.optional)) {
        context.addIssue({
          code: "custom",
          path: ["entries", key],
          message: "invalid checklist entry",
        });
      }
    }
  });

/** Old requests have no checklist; never mark their documents as checked automatically. */
export function readPol01Checklist(value: unknown, context: Pol01ChecklistContext) {
  const result = pol01ChecklistSchema.safeParse(value);
  return reconcilePol01Checklist(result.success ? result.data : createPol01Checklist(), context);
}
