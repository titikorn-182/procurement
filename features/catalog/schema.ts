import { z } from "zod";

export const catalogQuerySchema = z.object({
  query: z.string().trim().max(120),
  category: z.string().max(30),
  page: z.number().int().min(0).max(10000),
});

export const catalogEntrySchema = z.object({
  item_id: z.uuid(),
  price_id: z.uuid(),
  import_id: z.uuid().nullable(),
  origin: z.enum(["excel", "manual"]).default("excel"),
  version: z.number().int().positive().default(1),
  active: z.boolean().default(true),
  image_path: z.string().nullable().default(null),
  item_code: z.string().min(1).max(100),
  category_code: z.string(),
  category_name: z.string(),
  subcategory: z.string(),
  name: z.string().min(1).max(300),
  specification: z.string().max(1000),
  unit: z.string().min(1).max(100),
  notes: z.string(),
  reference_price: z.number().finite().min(0).max(999_999_999_999.99),
  source_name: z.string().min(1).max(300),
  reference_date: z.iso.date().nullable(),
  valid_until: z.iso.date().nullable(),
  status: z.enum(["unverified", "verified", "withdrawn"]),
  expired: z.boolean(),
  sheet_name: z.string().nullable(),
  row_number: z.number().int().positive().nullable(),
  file_name: z.string().nullable(),
});

export const catalogDataSchema = z.object({
  items: z.array(catalogEntrySchema).max(20),
  total: z.number().int().nonnegative(),
  categories: z.array(z.object({ code: z.string(), name: z.string() })),
});

export type CatalogEntry = z.infer<typeof catalogEntrySchema>;
export type CatalogQuery = z.infer<typeof catalogQuerySchema>;
export type CatalogData = z.infer<typeof catalogDataSchema>;
export type CatalogResult = { data: CatalogData | null; error: string | null };
