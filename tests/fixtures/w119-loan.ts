import type { LoanAgreement } from "../../app/requests/w119/loan-agreement";

export function createLoanAgreementFixture(): LoanAgreement {
  return {
    contractNo: "",
    borrowerName: "ผู้ยืมทดสอบ (ข้อมูลจำลอง)",
    borrowerPosition: "เจ้าหน้าที่ทดสอบ",
    affiliation: "สำนักงานเลขานุการคณะรัฐศาสตร์",
    projectType: "project",
    projectName: "โครงการทดสอบระบบ (ข้อมูลจำลอง)",
    purpose: "จัดหาวัสดุเพื่อทดสอบแบบฟอร์ม ไม่ใช่รายการจริง",
    endDate: "2026-10-20",
    accountName: "บัญชีทดสอบ",
    accountNumber: "000-000000-0",
    bankName: "ธนาคารทดสอบ",
    transferDate: "2026-10-15",
    transferPurpose: "ค่าใช้จ่ายตามโครงการทดสอบ",
  };
}
