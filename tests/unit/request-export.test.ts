import { describe, it, expect } from "vitest";
import { buildRequestCsv, MAX_EXPORT_ROWS } from "@/features/requests/export";
import type { RequestRow } from "@/features/requests/types";

const row = (id: number): RequestRow => ({
  id: String(id),
  type: "ซื้อ",
  title: "=formula",
  unit: "Test",
  amount: 1,
  date: "today",
  status: "ร่าง",
  step: "ขั้นตอนที่ 1",
});
describe("request CSV export", () => {
  it("exports more than 1000 rows in bounded batches, with formula escaping", async () => {
    const pages: number[] = [];
    const csv = await buildRequestCsv(async (page) => {
      pages.push(page);
      return {
        rows: Array.from({ length: page === 3 ? 1 : 500 }, (_, i) => row((page - 1) * 500 + i)),
        total: 1001,
        page,
        error: null,
      };
    });
    expect(pages).toEqual([1, 2, 3]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv.split("\r\n")).toHaveLength(1002);
    expect(csv).toContain("'=formula");
  });
  it("rejects oversized exports instead of truncating", async () => {
    await expect(
      buildRequestCsv(async () => ({ rows: [], total: MAX_EXPORT_ROWS + 1, page: 1, error: null })),
    ).rejects.toThrow("10,000");
  });
  it.each(["error", "count", "duplicate", "missing"])(
    "refuses partial output on %s",
    async (fault) => {
      await expect(
        buildRequestCsv(async (page) => ({
          rows:
            page === 1
              ? Array.from({ length: 500 }, (_, i) => row(i))
              : fault === "missing"
                ? []
                : [row(fault === "duplicate" ? 0 : 500)],
          total: page === 2 && fault === "count" ? 502 : 501,
          page,
          error: page === 2 && fault === "error" ? "network error" : null,
        })),
      ).rejects.toThrow();
    },
  );
});
