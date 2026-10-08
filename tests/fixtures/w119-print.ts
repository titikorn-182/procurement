import { toW119PrintData } from "../../app/requests/w119/w119-print-data";

export function createW119Fixture() {
  return toW119PrintData({
    request_no: "W119-TEST",
    title: "ขอซื้อวัสดุสำหรับกิจกรรม (ข้อมูลจำลอง)",
    rationale: "ใช้ในการจัดกิจกรรมของคณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี (ข้อมูลจำลองสำหรับทดสอบ)",
    required_date: "2026-10-19",
    estimated_amount: 6270,
    profiles: { full_name: "ผู้ขอซื้อทดสอบ", position_title: "เจ้าหน้าที่บริหารงานทั่วไป" },
    form_data: {
      formType: "w119",
      documentNo: "อว 0604.19/ทดสอบ",
      memoDate: "2026-10-08",
      departmentName: "สำนักงานเลขานุการคณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี",
      phone: "3944",
      addressee: "อธิการบดี",
      advanceRequired: true,
      budgetCodes: {
        sourceCode: "2",
        departmentCode: "2301",
        fundCode: "1",
        planCode: "5102",
        subprojectCode: "51025200",
        activityCode: "510252000001",
      },
    },
    request_items: [
      {
        line_no: 1,
        description: "วัสดุประกอบกิจกรรม - ชุดที่ 1",
        unit: "ชุด",
        quantity: 3,
        unit_price: 1290,
        total_amount: 3870,
      },
      {
        line_no: 2,
        description: "วัสดุประกอบกิจกรรม - ชุดที่ 2",
        unit: "ชุด",
        quantity: 3,
        unit_price: 800,
        total_amount: 2400,
      },
    ],
  });
}
