export function formatThaiDocumentDate(value: unknown): string {
  if (typeof value !== "string" || !value.trim()) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Intl.DateTimeFormat("th-TH", { dateStyle: "long", timeZone: "Asia/Bangkok" }).format(
        date,
      );
}

export { formatThaiAmount as formatDocumentMoney } from "../format/money";
