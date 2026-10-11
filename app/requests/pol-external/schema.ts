import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);
export const externalPol01Schema = z
  .object({
    version: z.literal(1),
    method: z.enum(["purchase", "rent", "hire"]),
    departmentName: text(300),
    phone: text(50),
    documentNo: z.string().trim().max(100),
    memoDate: z.iso.date(),
    addressee: text(300),
    workUnit: text(300),
    procurementUnit: text(300),
    torNote: z.string().trim().max(500),
    itemNotes: z
      .array(
        z
          .object({
            lineNo: z.number().int().positive().max(200),
            note: z.string().trim().max(300),
          })
          .strict(),
      )
      .max(200),
  })
  .strict()
  .refine(
    (data) => new Set(data.itemNotes.map((item) => item.lineNo)).size === data.itemNotes.length,
    {
      message: "หมายเหตุรายการต้องไม่ซ้ำลำดับ",
    },
  );

export type ExternalPol01 = z.infer<typeof externalPol01Schema>;
export function readExternalPol01(value: unknown): ExternalPol01 | null {
  const parsed = externalPol01Schema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export const externalMethodLabels = { purchase: "ขอซื้อ", rent: "ขอเช่า", hire: "ขอจ้าง" } as const;

export function externalMetadataMatchesItems(
  metadata: ExternalPol01,
  kind: "purchase" | "hire",
  items: { line_no: number }[],
) {
  return (
    kind === (metadata.method === "purchase" ? "purchase" : "hire") &&
    metadata.itemNotes.every((note) => items.some((item) => item.line_no === note.lineNo))
  );
}

// Match PostgreSQL numeric(12,2)/numeric(14,2) without silently rounding input.
export function externalLineAmount(quantity: number, unitPrice: number): number | null {
  if (
    !Number.isFinite(quantity) ||
    !Number.isFinite(unitPrice) ||
    quantity <= 0 ||
    quantity > 999_999_999 ||
    unitPrice < 0 ||
    unitPrice > 999_999_999_999.99
  )
    return null;
  if (
    [quantity, unitPrice].some(
      (value) => Math.abs(value * 100 - Math.round(value * 100)) > 0.000001,
    )
  )
    return null;
  const cents =
    (BigInt(Math.round(quantity * 100)) * BigInt(Math.round(unitPrice * 100)) + BigInt(50)) /
    BigInt(100);
  return cents <= BigInt(99_999_999_999_999) ? Number(cents) / 100 : null;
}
export function externalAmountsValid(items: { quantity: number; unit_price: number }[]) {
  const amounts = items.map((item) => externalLineAmount(item.quantity, item.unit_price));
  return (
    amounts.every((amount) => amount != null) &&
    amounts.reduce<number>((sum, amount) => sum + Math.round((amount ?? 0) * 100), 0) <=
      99_999_999_999_999
  );
}
