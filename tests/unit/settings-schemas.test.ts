import { describe, expect, it } from "vitest";
import { settingSchemas } from "../../app/settings/schemas";

describe("settingSchemas", () => {
  it("accepts a valid SLA configuration", () => {
    expect(
      settingSchemas.sla.safeParse({
        review_days: 2,
        approval_days: 3,
        business_days_only: true,
      }).success,
    ).toBe(true);
  });

  it("rejects an unknown setting field", () => {
    expect(
      settingSchemas.notifications.strict().safeParse({
        in_app: true,
        email: true,
        line: false,
        service_role_key: "must-not-be-stored",
      }).success,
    ).toBe(false);
  });
});
