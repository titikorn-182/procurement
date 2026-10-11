import { describe, it, expect } from "vitest";
import { parseListFilters, listHref, literalSearchPattern, pageCount } from "@/lib/pagination";
import { readPage } from "@/lib/server/read-page";

describe("list URL contract", () => {
  it.each(["0", "-1", "NaN", "Infinity", "1.2", "1e3", "9007199254740992"])(
    "normalizes invalid page %s",
    (page) => {
      expect(parseListFilters({ page }, []).page).toBe(1);
    },
  );
  it("validates enums, trims text, bounds length and takes the first repeated parameter", () => {
    expect(
      parseListFilters({ q: ["  ทดสอบ  ", "ignored"], page: "20", kind: "hire", status: "draft" }, [
        "draft",
      ]),
    ).toEqual({ q: "ทดสอบ", page: 20, kind: "hire", status: "draft" });
    expect(
      parseListFilters({ q: "a".repeat(300), status: "constructor", kind: "bad" }, ["draft"]),
    ).toEqual({ q: "a".repeat(200), page: 1, kind: "all", status: "all" });
  });
  it("preserves filters in page links and encodes punctuation", () => {
    const filters = { q: "ก&%_", kind: "hire", status: "draft", page: 8 };
    const url = new URL(listHref("/requests", filters, 2), "https://example.test");
    expect(parseListFilters(Object.fromEntries(url.searchParams), ["draft"])).toEqual({
      ...filters,
      page: 2,
    });
    expect(listHref("/requests", { q: "", kind: "all", status: "all", page: 1 })).toBe("/requests");
    expect(literalSearchPattern("a%_\\b,(c)*")).toBe("a%_\\\\b,\\(c\\)\\*");
  });
  it("counts pages including empty and partial final pages", () => {
    expect([0, 1, 10, 11, 1001].map((n) => pageCount(n))).toEqual([1, 1, 1, 2, 101]);
  });
});

describe("database page reader", () => {
  it("requests exactly ten rows and retains the authorized total", async () => {
    const ranges: number[][] = [];
    const result = await readPage(
      async (from, to) => {
        ranges.push([from, to]);
        return { data: ["row"], count: 1001, error: null };
      },
      101,
      10,
    );
    expect(ranges).toEqual([[1000, 1009]]);
    expect(result).toEqual({ rows: ["row"], total: 1001, page: 101, error: null });
  });
  it.each([false, true])("recovers out-of-range offset (PostgREST error=%s)", async (error) => {
    const ranges: number[][] = [];
    const result = await readPage(
      async (from, to) => {
        ranges.push([from, to]);
        return {
          data: from > 10 ? [] : ["row"],
          count: 11,
          error: error && from > 10 ? { code: "PGRST103" } : null,
        };
      },
      20,
      10,
    );
    expect(result.page).toBe(2);
    expect(result.total).toBe(11);
    expect(ranges.at(-1)).toEqual([10, 19]);
    expect(ranges.length).toBeLessThanOrEqual(3);
  });
  it("does not hide database errors as an empty result", async () => {
    await expect(
      readPage(async () => ({ data: null, count: null, error: { code: "42501" } }), 1, 10),
    ).rejects.toEqual({ code: "42501" });
    await expect(
      readPage(async () => ({ data: [], count: null, error: null }), 1, 10),
    ).rejects.toThrow("Missing exact");
  });
});
