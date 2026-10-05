import { describe, expect, it } from "vitest";
import { settingSchemas, userSettingsUpdateSchema } from "../../app/settings/schemas";

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

  it("validates editable user identity fields", () => {
    expect(
      userSettingsUpdateSchema.safeParse({
        userId: "11111111-1111-4111-8111-111111111111",
        fullName: " นายทดสอบ ระบบงาน ",
        positionTitle: " เจ้าหน้าที่บริหารงานทั่วไป ",
        role: "user",
        departmentId: "",
      }).success,
    ).toBe(true);

    expect(
      userSettingsUpdateSchema.safeParse({
        userId: "11111111-1111-4111-8111-111111111111",
        fullName: " ",
        positionTitle: "เจ้าหน้าที่",
        role: "user",
        departmentId: "",
      }).success,
    ).toBe(false);
  });
});
