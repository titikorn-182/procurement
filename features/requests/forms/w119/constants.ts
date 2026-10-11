import { type CompleteW119Item } from "@/app/requests/w119/item-input";
export const steps = ["บันทึกข้อความ", "รายการพัสดุ", "งบประมาณ", "เอกสารแนบ", "ตรวจสอบและส่ง"];

export { fiscalYears, fundSources, expenseCategories } from "./defaults";

export const itemExamples: CompleteW119Item[] = [
  {
    description: "กระดาษถ่ายเอกสาร A4 80 แกรม",
    quantity: 10,
    unit: "รีม",
    unitPrice: 120,
    marketPrice: 120,
    priceSource: "ใบเสนอราคา",
  },
  {
    description: "แฟ้มสันกว้าง 3 นิ้ว",
    quantity: 20,
    unit: "เล่ม",
    unitPrice: 75,
    marketPrice: 75,
    priceSource: "ราคาตลาด",
  },
  {
    description: "ปากกาลูกลื่นสีน้ำเงิน",
    quantity: 50,
    unit: "ด้าม",
    unitPrice: 8,
    marketPrice: 8,
    priceSource: "ราคาซื้อครั้งล่าสุด",
  },
];

export const inputClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-[var(--line-dark)] focus:border-orange-400 focus:ring-4 focus:ring-orange-100";

export { formatThaiBaht as money } from "@/lib/format/money";
