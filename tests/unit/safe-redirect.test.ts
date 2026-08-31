import { describe, expect, it } from "vitest";
import { getSafeInternalRedirect } from "../../lib/auth/safe-redirect";

describe("getSafeInternalRedirect", () => {
  it("keeps a local path including its query and hash", () => {
    expect(getSafeInternalRedirect("/requests?status=pending#top")).toBe(
      "/requests?status=pending#top",
    );
  });

  it.each([
    "https://example.com/phishing",
    "//example.com/phishing",
    "/\\example.com/phishing",
    "javascript:alert(1)",
    " requests",
    null,
    undefined,
  ])("rejects an unsafe redirect value: %s", (value) => {
    expect(getSafeInternalRedirect(value)).toBe("/");
  });
});
