import { z } from "zod";
import {
  catalogDataSchema,
  type CatalogEntry,
  type CatalogResult,
} from "@/features/catalog/schema";

export const CATALOG_IMAGE_MAX_BYTES = 2 * 1024 * 1024;
export const CATALOG_IMAGE_MAX_DIMENSION = 6000;
export const CATALOG_IMAGE_MAX_PIXELS = 16_000_000;

const uuidPattern = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
export const catalogImagePathSchema = z
  .string()
  .regex(
    new RegExp(`^items/${uuidPattern}/${uuidPattern}/${uuidPattern}\\.(?:jpg|png|webp)$`),
    "ตำแหน่งรูปภาพไม่ถูกต้อง กรุณาอัปโหลดรูปใหม่",
  );
const text = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .refine((value) => !value.includes("\u0000"), "ข้อความมีอักขระที่ไม่รองรับ");
const requiredText = (max: number) =>
  text(max).refine((value) => value.length > 0, "กรุณากรอกข้อมูลให้ครบ");
const date = z.iso.date().nullable();

export const catalogPriceInputSchema = z
  .object({
    reference_price: z
      .number()
      .finite()
      .min(0)
      .max(999_999_999_999.99)
      .refine(
        (value) => Math.round(value * 100) / 100 === value,
        "กรุณาระบุราคาไม่เกิน 2 ตำแหน่งทศนิยม",
      ),
    source_name: requiredText(300),
    reference_date: date,
    valid_until: date,
  })
  .strict()
  .superRefine((value, context) => {
    if (value.valid_until && !value.reference_date)
      context.addIssue({
        code: "custom",
        path: ["reference_date"],
        message: "กรุณาระบุวันที่อ้างอิงก่อนกำหนดวันหมดอายุ",
      });
    if (value.reference_date && value.valid_until && value.valid_until < value.reference_date)
      context.addIssue({
        code: "custom",
        path: ["valid_until"],
        message: "วันหมดอายุต้องไม่อยู่ก่อนวันที่อ้างอิง",
      });
  });

export const catalogSaveSchema = z
  .object({
    item_id: z.uuid(),
    expected_version: z.number().int().positive().max(2_147_483_646).nullable(),
    item_code: requiredText(100).refine(
      (value) => /^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(value),
      "รหัสรายการใช้ตัวอักษรภาษาอังกฤษ ตัวเลข . _ / และ - เท่านั้น",
    ),
    category_code: requiredText(30),
    subcategory: text(100),
    name: requiredText(300),
    specification: text(1000),
    unit: requiredText(100),
    notes: text(2000),
    active: z.boolean(),
    image_path: catalogImagePathSchema.nullable(),
    price: catalogPriceInputSchema.nullable(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.expected_version === null && !value.price)
      context.addIssue({
        code: "custom",
        path: ["price"],
        message: "รายการใหม่ต้องระบุราคาอ้างอิงและแหล่งที่มา",
      });
    if (value.image_path && value.image_path.split("/")[1] !== value.item_id)
      context.addIssue({
        code: "custom",
        path: ["image_path"],
        message: "รูปภาพนี้ไม่ได้อัปโหลดสำหรับรายการนี้",
      });
  });

export const catalogSavedSchema = z.object({
  item_id: z.uuid(),
  version: z.number().int().positive(),
});
export const catalogManagementDataSchema = catalogDataSchema;
export type CatalogManagementEntry = CatalogEntry;
export type CatalogSaveInput = z.infer<typeof catalogSaveSchema>;
export type CatalogManageResult = CatalogResult;
export type CatalogSaveResult = {
  data: z.infer<typeof catalogSavedSchema> | null;
  error: string | null;
};
export type CatalogAccess = { canRead: boolean; canManage: boolean; error: string | null };
export type CatalogImageUploadResult = { path: string | null; error: string | null };
