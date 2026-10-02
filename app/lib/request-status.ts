const requestStatusLabels = {
  draft: "ฉบับร่าง",
  submitted: "ส่งคำขอแล้ว · รอตรวจสอบ",
  under_review: "อยู่ระหว่างตรวจสอบ",
  returned: "ส่งกลับแก้ไข",
  not_approved: "ไม่เห็นชอบ",
  approved: "อนุมัติแล้ว",
  budget_control: "อยู่ระหว่างควบคุมยอดงบประมาณ",
  sourcing: "อยู่ระหว่างสืบราคา",
  ordered: "สั่งซื้อ/จ้างแล้ว",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
} as const;

export type RequestStatusCode = keyof typeof requestStatusLabels;

export function formatRequestStatus(value: unknown): string {
  if (typeof value !== "string") return "ไม่ทราบสถานะ";
  return requestStatusLabels[value as RequestStatusCode] ?? "ไม่ทราบสถานะ";
}
