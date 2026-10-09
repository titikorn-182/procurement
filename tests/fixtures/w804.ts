import { createW804Draft } from "../../app/requests/w804/model";

/** Synthetic fixture only; never submitted or stored in production. */
export function createW804Fixture() {
  const draft = createW804Draft("2570");
  return {
    ...draft,
    title: "วัสดุสำนักงานสำหรับทดสอบแบบฟอร์ม",
    purchase: { number: "ทดสอบ/1", date: "2026-10-09" },
    summary: { number: "ทดสอบ/2", date: "2026-10-12" },
    settlement: { number: "ทดสอบ/3", date: "2026-10-13" },
    rationale: "ข้อมูลสมมติสำหรับตรวจสอบเอกสาร ไม่ใช่รายการจัดซื้อจริง",
    objectives: "ใช้ตรวจสอบความครบถ้วนของแบบฟอร์มและการแบ่งหน้าเอกสาร",
    scope: "จัดซื้อวัสดุสำนักงานตามรายละเอียดและจำนวนที่ระบุ",
    delivery: "ส่งมอบ ณ คณะรัฐศาสตร์ ภายในกำหนดที่ตกลง",
    budget: {
      ...draft.budget,
      source: "เงินรายได้",
      plan: "แผนงานทดสอบ",
      sourceCode: "2",
      departmentCode: "2301",
      fundCode: "4",
      activityCode: "0000123456",
    },
    items: [
      {
        description: "กระดาษสำหรับทดสอบ",
        specification: "ขนาด A4 ตามรายละเอียดที่หน่วยงานกำหนด",
        quantity: 10,
        unit: "รีม",
        unitPrice: 150,
      },
    ],
    preparer: { name: "ผู้จัดทำ ทดสอบระบบ", position: "เจ้าหน้าที่ทดสอบ" },
    approvalNumber: "อ้างอิงทดสอบ/1",
    approvalDate: "2026-10-09",
    approvedAmount: 1500,
    receipts: [
      {
        date: "2026-10-10",
        vendor: "ร้านค้าสมมติสำหรับทดสอบ",
        number: "TEST-01",
        description: "กระดาษ A4",
        quantity: "10 รีม",
        amount: 1400,
      },
    ],
    loanNumber: "LOAN-TEST-01",
    loanDate: "2026-10-09",
    loanAmount: 1500,
  };
}
