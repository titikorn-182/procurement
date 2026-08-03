export type RequestStatus = "รอตรวจสอบ" | "รอเห็นชอบ" | "คุมยอด" | "เกินกำหนด" | "เสร็จสิ้น" | "ร่าง";

export const requests = [
  { id: "PR6705-00045", title: "จัดซื้อวัสดุสำนักงาน จำนวน 12 รายการ", requester: "ธนพร จ.", unit: "สำนักงานเลขานุการ", amount: 24750, date: "20 พ.ค. 2567", due: "24 พ.ค. 2567", status: "เกินกำหนด" as RequestStatus, step: "รอตรวจสอบ", type: "ซื้อ" },
  { id: "PR6705-00044", title: "จ้างเหมาบริการทำความสะอาดอาคารเรียน", requester: "อารีย์ พ.", unit: "กองอาคารสถานที่", amount: 96300, date: "19 พ.ค. 2567", due: "24 พ.ค. 2567", status: "รอตรวจสอบ" as RequestStatus, step: "รอตรวจสอบ", type: "จ้าง" },
  { id: "PR6705-00043", title: "จัดซื้อคอมพิวเตอร์สำหรับห้องปฏิบัติการ", requester: "ณัฐพล ป.", unit: "คณะวิทยาศาสตร์", amount: 185000, date: "18 พ.ค. 2567", due: "27 พ.ค. 2567", status: "รอเห็นชอบ" as RequestStatus, step: "รองคณบดีเห็นชอบ", type: "ซื้อ" },
  { id: "PR6705-00042", title: "จ้างเหมาบริการซ่อมแซมระบบไฟฟ้า", requester: "วิทยา ช.", unit: "กองอาคารสถานที่", amount: 42800, date: "17 พ.ค. 2567", due: "23 พ.ค. 2567", status: "เกินกำหนด" as RequestStatus, step: "คุมยอด", type: "จ้าง" },
  { id: "PR6705-00041", title: "จัดซื้อวัสดุวิทยาศาสตร์และสารเคมี", requester: "สุภัทรา ม.", unit: "คณะวิทยาศาสตร์", amount: 138450, date: "16 พ.ค. 2567", due: "24 พ.ค. 2567", status: "คุมยอด" as RequestStatus, step: "เจ้าหน้าที่การเงิน", type: "ซื้อ" },
  { id: "PR6705-00040", title: "จัดซื้อวัสดุงานบ้านงานครัว", requester: "กมลวรรณ ศ.", unit: "สำนักงานเลขานุการ", amount: 8450, date: "15 พ.ค. 2567", due: "29 พ.ค. 2567", status: "ร่าง" as RequestStatus, step: "ผู้ยื่นคำขอ", type: "ซื้อ" },
];

export const approvalSteps = [
  { n: 1, label: "สร้างคำขอ", short: "สร้างคำขอ", count: 1, state: "done" },
  { n: 2, label: "เจ้าหน้าที่พัสดุตรวจสอบ", short: "ตรวจสอบ", count: 2, state: "done" },
  { n: 3, label: "รองคณบดี/หัวหน้าสำนักงาน", short: "เห็นชอบ", count: 5, state: "current" },
  { n: 4, label: "ผู้บริหารอนุมัติหลักการ", short: "อนุมัติ", count: 3, state: "waiting" },
  { n: 5, label: "จัดทำรายงานขอซื้อ/จ้าง", short: "ทำรายงาน", count: 2, state: "overdue" },
  { n: 6, label: "เจ้าหน้าที่การเงินคุมยอด", short: "คุมยอด", count: 4, state: "waiting" },
  { n: 7, label: "สืบราคาและเห็นชอบ", short: "สืบราคา", count: 3, state: "waiting" },
  { n: 8, label: "เสร็จสิ้น", short: "เสร็จสิ้น", count: 12, state: "waiting" },
] as const;

export const processColumns = [
  { title: "ตรวจสอบ", count: 4, items: requests.slice(0, 2) },
  { title: "เห็นชอบ", count: 3, items: requests.slice(2, 3) },
  { title: "คุมยอด", count: 2, items: requests.slice(3, 4) },
  { title: "อนุมัติ", count: 2, items: requests.slice(4, 5) },
  { title: "เสร็จสิ้น", count: 18, items: [{ ...requests[5], id: "PR6705-00039", status: "เสร็จสิ้น" as RequestStatus }] },
];
