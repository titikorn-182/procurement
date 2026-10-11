/** Screen currency includes ฿; document amounts intentionally do not. No rounding of stored data. */
export function formatThaiBaht(value: number): string {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(value);
}

export function formatThaiAmount(value: number): string {
  return value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
