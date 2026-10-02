import { describe, expect, it } from "vitest";
import { toThaiBahtText } from "../../app/payments/new/pol02";

describe("toThaiBahtText", () => {
  it("converts whole-baht and satang values", () => {
    expect(toThaiBahtText(0)).toBe("ศูนย์บาทถ้วน");
    expect(toThaiBahtText(21)).toBe("ยี่สิบเอ็ดบาทถ้วน");
    expect(toThaiBahtText(101.25)).toBe("หนึ่งร้อยเอ็ดบาทยี่สิบห้าสตางค์");
  });

  it("supports values above one million", () => {
    expect(toThaiBahtText(1_000_001)).toBe("หนึ่งล้านหนึ่งบาทถ้วน");
  });
});
