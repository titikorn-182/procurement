const genericDraftError = "ไม่สามารถส่งคำขอได้ กรุณาลองใหม่";

/** Only translate a known database validation failure; never expose raw database messages. */
export function getRequestDraftErrorMessage(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "P0001" &&
    "message" in error &&
    error.message === "department is required"
  ) {
    return "ยังส่งคำขอไม่ได้ เนื่องจากบัญชีของคุณยังไม่ได้กำหนดหน่วยงาน กรุณาให้ผู้ดูแลระบบไปที่ ตั้งค่าระบบ > ผู้ใช้และสิทธิ์ เลือกหน่วยงานของคุณและกดบันทึก แล้วกลับมากดส่งคำขออีกครั้ง โดยไม่ต้องปิดหรือรีเฟรชหน้านี้";
  }

  return genericDraftError;
}
