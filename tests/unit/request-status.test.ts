import { describe, expect, it } from "vitest";
import { formatRequestStatus } from "../../app/lib/request-status";

describe("formatRequestStatus", () => {
  it("translates submitted status into an actionable Thai label", () => {
    expect(formatRequestStatus("submitted")).toBe("ส่งคำขอแล้ว · รอตรวจสอบ");
  });

  it("covers terminal and revision states", () => {
    expect(formatRequestStatus("returned")).toBe("ส่งกลับแก้ไข");
    expect(formatRequestStatus("completed")).toBe("เสร็จสิ้น");
    expect(formatRequestStatus("cancelled")).toBe("ยกเลิก");
  });

  it("does not expose unknown internal codes", () => {
    expect(formatRequestStatus("unexpected_status")).toBe("ไม่ทราบสถานะ");
    expect(formatRequestStatus(null)).toBe("ไม่ทราบสถานะ");
  });
});
