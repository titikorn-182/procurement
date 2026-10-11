/** Display labels used by request lists and badges, not database status codes. */
export type RequestStatus =
  | "รอตรวจสอบ"
  | "รอเห็นชอบ"
  | "คุมยอด"
  | "เกินกำหนด"
  | "เสร็จสิ้น"
  | "ร่าง"
  | "ส่งกลับแก้ไข"
  | "ไม่เห็นชอบ"
  | "อนุมัติแล้ว"
  | "สืบราคา"
  | "สั่งซื้อ/จ้างแล้ว"
  | "ยกเลิก";
