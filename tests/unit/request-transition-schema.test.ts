import { describe, expect, it } from "vitest";
import { parseTransitionRequestForm } from "../../app/requests/[id]/schemas";

const requestId = "123e4567-e89b-42d3-a456-426614174000";

function form(decision: string, comment = "") {
  const data = new FormData();
  data.set("requestId", requestId);
  data.set("decision", decision);
  data.set("comment", comment);
  return data;
}

describe("parseTransitionRequestForm", () => {
  it("allows approval without a comment", () => {
    expect(parseTransitionRequestForm(form("approve")).success).toBe(true);
  });

  it.each(["return", "reject"])("requires a reason for %s", (decision) => {
    const result = parseTransitionRequestForm(form(decision));
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.message).toContain("กรุณาระบุเหตุผล");
    }
  });

  it("rejects unknown decisions and invalid request IDs", () => {
    expect(parseTransitionRequestForm(form("cancel")).success).toBe(false);
    const invalidId = form("approve");
    invalidId.set("requestId", "PR2610-00007");
    expect(parseTransitionRequestForm(invalidId).success).toBe(false);
  });

  it("limits comments to 2,000 characters", () => {
    expect(parseTransitionRequestForm(form("return", "ก".repeat(2001))).success).toBe(false);
  });
});
