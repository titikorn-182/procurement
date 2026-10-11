import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { W804Navigation } from "../../app/components/w804-navigation";

describe("W804 sidebar navigation", () => {
  it.each([false, true])("renders one direct link with active=%s and no dropdown", (active) => {
    const html = renderToStaticMarkup(createElement(W804Navigation, { active }));
    expect(html.match(/<a\s/g)).toHaveLength(1);
    expect(html).toContain('href="/requests/w804"');
    expect(html).toContain("คำขอซื้อ ว804");
    expect(html).toContain("ไม่เกิน 50,000 บาท");
    expect(html).not.toMatch(/<details|<summary|<ul|aria-expanded|chevron-down/);
    expect(html).not.toContain("?document=");
    expect(html.includes('aria-current="page"')).toBe(active);
  });
});
