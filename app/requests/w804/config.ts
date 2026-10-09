export const W804_LIMIT = 50_000;
export const W804_FACULTY = "คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี";
export const W804_CIRCULAR = "กค (กวจ) 0405.2/ว 804 ลงวันที่ 12 พฤศจิกายน 2568";
export const W804_DOCUMENTS = [
  { id: "purchase", label: "รายงานขอซื้อและรายละเอียด TOR" },
  { id: "summary", label: "รายงานสรุปผลการจัดซื้อ" },
  { id: "settlement", label: "รายงานส่งใช้เงินยืม" },
] as const;
export type W804DocumentKind = (typeof W804_DOCUMENTS)[number]["id"];
export function documentKind(value: unknown): W804DocumentKind {
  return W804_DOCUMENTS.find(({ id }) => id === value)?.id ?? "purchase";
}
