/** Quote every cell and neutralize spreadsheet formulas, including leading control characters. */
export function csvCell(value: unknown): string {
  const raw = String(value ?? "");
  const safe = /^[\s\u0000-\u001f]*[=+@-]/u.test(raw) || /^[\t\r\n]/u.test(raw) ? `'${raw}` : raw;
  return `"${safe.replaceAll('"', '""')}"`;
}
