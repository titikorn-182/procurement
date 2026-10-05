import { describe, expect, it } from "vitest";
import {
  createDefaultPol01ApprovalDetails,
  normalizePol01ApprovalDetails,
} from "../../app/requests/pol01";

describe("POL01 approval details", () => {
  it("creates independent editable defaults", () => {
    const first = createDefaultPol01ApprovalDetails();
    const second = createDefaultPol01ApprovalDetails();

    first.committee[0].name = "แก้ไขเฉพาะชุดแรก";
    expect(second.committee[0].name).toBe("นายฐิติกรณ์รัศมิ์ ภัททสิริภูวดล");
  });

  it("fills missing legacy values with the approved POL01 defaults", () => {
    const details = normalizePol01ApprovalDetails({
      requester: { name: "ผู้ขอรายใหม่", position: "เจ้าหน้าที่" },
    });

    expect(details.requester.name).toBe("ผู้ขอรายใหม่");
    expect(details.endorser.name).toBe("นายวุฒิ อิงคภาวรวงศ์");
    expect(details.approver.name).toBe("นางสาวศิริพร จันทนสกุลวงศ์");
    expect(details.committee).toHaveLength(3);
  });
});
