import { describe, expect, it } from "vitest";
import { getRequestDraftErrorMessage } from "../../app/requests/new/submission-errors";

describe("request draft submission errors", () => {
  it("explains how an administrator can fix a missing profile department", () => {
    const message = getRequestDraftErrorMessage({
      code: "P0001",
      message: "department is required",
      details: null,
      hint: null,
    });

    expect(message).toContain("บัญชีของคุณยังไม่ได้กำหนดหน่วยงาน");
    expect(message).toContain("ผู้ดูแลระบบ");
    expect(message).toContain("ตั้งค่าระบบ > ผู้ใช้และสิทธิ์");
    expect(message).toContain("เลือกหน่วยงานของคุณและกดบันทึก");
    expect(message).toContain("ไม่ต้องปิดหรือรีเฟรชหน้านี้");
    expect(message).not.toContain("department is required");
  });

  it.each([
    null,
    undefined,
    "department is required",
    { message: "department is required" },
    { code: "42501", message: "department is required" },
    { code: "P0001", message: "department is required: private detail" },
    { code: "23505", message: "private constraint name", details: "private record" },
  ])("keeps unknown or malformed errors private: %j", (error) => {
    expect(getRequestDraftErrorMessage(error)).toBe("ไม่สามารถส่งคำขอได้ กรุณาลองใหม่");
  });
});
