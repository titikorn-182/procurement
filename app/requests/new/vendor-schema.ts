import { z } from "zod";

export const vendorNameSchema = z
  .string()
  .trim()
  .min(2, "กรุณาระบุชื่อผู้ประกอบการอย่างน้อย 2 ตัวอักษร")
  .max(200, "ชื่อผู้ประกอบการต้องไม่เกิน 200 ตัวอักษร")
  .refine((name) => !/[\u0000-\u001f\u007f]/.test(name), "ชื่อผู้ประกอบการมีอักขระที่ไม่รองรับ")
  .refine((name) => /[\p{L}\p{N}]/u.test(name), "กรุณาระบุชื่อผู้ประกอบการให้ถูกต้อง");

export const createdVendorSchema = z.object({
  id: z.uuid(),
  display_name: z.string().min(1),
  created: z.boolean(),
});

export type VendorCreateResult =
  | { vendor: { id: string; name: string }; created: boolean; error: null }
  | { vendor: null; created: false; error: string };
