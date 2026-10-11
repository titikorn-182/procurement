import type { RequestRow } from "./types";
import type { PageResult } from "@/lib/pagination";
import { csvCell } from "@/lib/format/csv";

export const EXPORT_BATCH_SIZE = 500;
export const MAX_EXPORT_ROWS = 10_000;

/** All-or-error: never download a truncated export after a failed batch. */
export async function buildRequestCsv(read: (page: number) => Promise<PageResult<RequestRow>>) {
  const first = await read(1);
  if (first.error) throw new Error(first.error);
  if (first.total > MAX_EXPORT_ROWS)
    throw new Error("ผลการค้นหาเกิน 10,000 รายการ กรุณาระบุคำค้นหรือตัวกรองให้แคบลงก่อนส่งออก");
  const seen = new Set<string>();
  const lines = [
    ["เลขคำขอ", "ประเภท", "ชื่อเรื่อง", "วันที่", "วงเงิน", "สถานะ", "ขั้นตอน"]
      .map(csvCell)
      .join(","),
  ];
  const pages = Math.max(1, Math.ceil(first.total / EXPORT_BATCH_SIZE));
  for (let page = 1; page <= pages; page++) {
    const result = page === 1 ? first : await read(page);
    if (result.error) throw new Error(result.error);
    if (result.total !== first.total || result.page !== page)
      throw new Error("รายการมีการเปลี่ยนแปลงระหว่างส่งออก กรุณาลองใหม่");
    for (const row of result.rows) {
      if (seen.has(row.id)) throw new Error("รายการมีการเปลี่ยนแปลงระหว่างส่งออก กรุณาลองใหม่");
      seen.add(row.id);
      lines.push(
        [row.id, row.type, row.title, row.date, row.amount, row.status, row.step]
          .map(csvCell)
          .join(","),
      );
    }
  }
  if (seen.size !== first.total)
    throw new Error("ได้รับข้อมูลไม่ครบ จึงยังไม่สร้างไฟล์ กรุณาลองใหม่");
  return "\uFEFF" + lines.join("\r\n");
}
