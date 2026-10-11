import type { RequestStatus } from "./status.types";
import type { RequestRow } from "./types";
import type { RequestListRecord } from "@/lib/supabase/list-database.types";

export const requestListStatuses = {
  draft: "ร่าง",
  review: "รอตรวจสอบ",
  returned: "ส่งกลับแก้ไข",
  not_approved: "ไม่เห็นชอบ",
  approved: "อนุมัติแล้ว",
  budget_control: "คุมยอด",
  sourcing: "สืบราคา",
  ordered: "สั่งซื้อ/จ้างแล้ว",
  completed: "เสร็จสิ้น",
  cancelled: "ยกเลิก",
  overdue: "เกินกำหนด",
} satisfies Record<string, RequestStatus>;

export function toRequestListRow(row: RequestListRecord): RequestRow {
  const labels: Record<string, RequestStatus> = requestListStatuses;
  return {
    id: row.request_no,
    type: row.kind === "hire" ? "จ้าง" : "ซื้อ",
    title: row.title,
    unit: row.department_name,
    amount: Number(row.estimated_amount),
    date: new Intl.DateTimeFormat("th-TH", {
      dateStyle: "medium",
      timeZone: "Asia/Bangkok",
    }).format(new Date(row.created_at)),
    status: labels[row.list_status] ?? "รอตรวจสอบ",
    step: `ขั้นตอนที่ ${row.current_step}`,
    budgetYear: row.budget_year,
    rawStatus: row.status,
  };
}
