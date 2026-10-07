import { createPaymentDetails } from "../../app/payments/new/pol02";
import type { PaymentLine, SourceRequest } from "../../app/payments/new/types";

export function createPol02Fixture() {
  const request: SourceRequest = {
    id: "11111111-1111-4111-8111-111111111111",
    requestNo: "POL01-TEST",
    title: "ขอเบิกค่าวัสดุสำนักงาน (ข้อมูลตัวอย่าง)",
    rationale: "ใช้ในการปฏิบัติงานภายในคณะ",
    requesterName: "ผู้ขอเบิกตัวอย่าง",
    departmentName: "สำนักงานเลขานุการ",
    budgetYear: 2570,
    fundSource: "เงินรายได้",
    planName: "แผนงานบริหารทั่วไป",
    expenseCategory: "ค่าวัสดุ",
    approvedDate: "2026-10-01",
    approved: 10000,
    paid: 1000,
    vendorName: "บริษัท ผู้ประกอบการตัวอย่าง จำกัด",
    departmentCode: "2301",
    fundCode: "8",
    activityCode: "100210230004",
    items: [
      { description: "กระดาษถ่ายเอกสาร A4 ขนาด 80 แกรม", quantity: 10, unitPrice: 120 },
      { description: "แฟ้มเอกสารสันกว้าง", quantity: 20, unitPrice: 75 },
    ],
  };
  const details = {
    ...createPaymentDetails(request),
    egpProjectNo: "EGP-TEST",
    contractNo: "PO-TEST-001",
    contractDate: "2026-10-02",
    vendorTaxId: "0000000000000",
    invoiceNo: "INV-TEST-001",
    invoiceDate: "2026-10-06",
    delivery:
      "ส่งมอบวัสดุครบถ้วนตามรายการ และตรวจรับเรียบร้อยเมื่อวันที่ 6 ตุลาคม 2569 (ข้อมูลตัวอย่าง)",
    vat: "189",
    installmentNumber: "2",
    installmentCount: "3",
  };
  const lines: PaymentLine[] = request.items.map((item, index) => ({
    id: `line-${index}`,
    description: item.description,
    quantity: String(item.quantity),
    unitPrice: String(item.unitPrice),
    attachmentType: "ใบส่งของ/ใบแจ้งหนี้",
    documentNo: `INV-TEST-00${index + 1}`,
  }));
  return {
    request,
    details,
    lines,
    selectedDocuments: ["delivery_invoice", "inspection"],
    attachmentNames: ["ใบแจ้งหนี้ตัวอย่าง.pdf", "ใบตรวจรับตัวอย่าง.pdf"],
    date: new Date("2026-10-07T08:00:00Z"),
  };
}
