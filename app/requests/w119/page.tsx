"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { AlertCircle, ArrowLeft, ArrowRight, Check, FileText, Info, Plus, Trash2, Upload, Users } from "lucide-react";
import { Button, PageHeader } from "../../components/ui";
import { submitRequest } from "../new/actions";

type RequestItem = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  marketPrice: number;
  priceSource: string;
};

const steps = ["บันทึกข้อความ", "รายการพัสดุ", "งบประมาณ", "ผู้ตรวจรับและเอกสาร", "ตรวจสอบและส่ง"];

const initialItems: RequestItem[] = [
  { description: "กระดาษถ่ายเอกสาร A4 80 แกรม", quantity: 10, unit: "รีม", unitPrice: 120, marketPrice: 120, priceSource: "ใบเสนอราคา" },
  { description: "แฟ้มสันกว้าง 3 นิ้ว", quantity: 20, unit: "เล่ม", unitPrice: 75, marketPrice: 75, priceSource: "ราคาตลาด" },
  { description: "ปากกาลูกลื่นสีน้ำเงิน", quantity: 50, unit: "ด้าม", unitPrice: 8, marketPrice: 8, priceSource: "ราคาที่เคยซื้อครั้งล่าสุด" },
];

const inputClass =
  "min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100";

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return <section className="border border-[var(--line-dark)] bg-[var(--paper)]"><header className="border-b border-[var(--line)] px-5 py-4"><h2 className="text-lg font-bold text-[var(--ink)]">{title}</h2><p className="mt-1 text-sm text-stone-500">{description}</p></header><div className="p-5 sm:p-6">{children}</div></section>;
}

function money(value: number) {
  return new Intl.NumberFormat("th-TH", { style: "currency", currency: "THB" }).format(value);
}

export default function NewRequestPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [requestType, setRequestType] = useState<"purchase" | "hire">("purchase");
  const [documentNo, setDocumentNo] = useState("อว 0604.19/");
  const [memoDate, setMemoDate] = useState("");
  const [departmentName, setDepartmentName] = useState("สำนักงานเลขานุการ คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี");
  const [phone, setPhone] = useState("3944");
  const [addressee, setAddressee] = useState("คณบดีคณะรัฐศาสตร์");
  const [title, setTitle] = useState("จัดซื้อวัสดุสำนักงานประจำปีงบประมาณ 2569");
  const [rationale, setRationale] = useState("เพื่อสนับสนุนการปฏิบัติงานของหน่วยงานให้เป็นไปอย่างต่อเนื่อง");
  const [requiredDate, setRequiredDate] = useState("");
  const [items, setItems] = useState<RequestItem[]>(initialItems);
  const [fiscalYear, setFiscalYear] = useState("2569");
  const [fundSource, setFundSource] = useState("เงินงบประมาณแผ่นดิน");
  const [planName, setPlanName] = useState("แผนงานบริหารทั่วไป");
  const [expenseCategory, setExpenseCategory] = useState("ค่าวัสดุ");
  const [sourceCode, setSourceCode] = useState("2");
  const [departmentCode, setDepartmentCode] = useState("2301");
  const [fundCode, setFundCode] = useState("6");
  const [planCode, setPlanCode] = useState("5102");
  const [subprojectCode, setSubprojectCode] = useState("51025200");
  const [activityCode, setActivityCode] = useState("510252000024");
  const [selectionCriteria, setSelectionCriteria] = useState("เกณฑ์ราคา");
  const [advanceRequired, setAdvanceRequired] = useState(false);
  const [inspectors, setInspectors] = useState(["", "", ""]);
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items],
  );

  function updateItem(index: number, patch: Partial<RequestItem>) {
    setItems((current) => current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item)));
  }

  function validateCurrentStep() {
    if (step === 0 && (!documentNo.trim() || !memoDate || !departmentName.trim() || !phone.trim() || !addressee.trim() || !title.trim() || !rationale.trim() || !requiredDate)) {
      return "กรุณากรอกข้อมูลบันทึกข้อความ เหตุผลความจำเป็น และวันที่ต้องการใช้ให้ครบถ้วน";
    }
    if (step === 1 && (items.length === 0 || items.some((item) => !item.description.trim() || !item.unit.trim() || item.quantity <= 0 || item.unitPrice < 0 || item.marketPrice < 0 || !item.priceSource.trim()))) {
      return "กรุณากรอกรายการ จำนวน หน่วย ราคา ราคากลาง และแหล่งที่มาของราคาให้ครบถ้วน";
    }
    if (step === 2 && (!fiscalYear || !fundSource || !planName || !expenseCategory || !sourceCode || !departmentCode || !fundCode || !planCode || !subprojectCode || !activityCode)) {
      return "กรุณาระบุข้อมูลงบประมาณให้ครบถ้วน";
    }
    return "";
  }

  function goNext() {
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setStep((current) => Math.min(current + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function handleSubmit() {
    setError("");
    startTransition(async () => {
      const result = await submitRequest({
        kind: requestType,
        title,
        rationale,
        requiredDate,
        budgetYear: Number(fiscalYear),
        fundSource,
        planName,
        expenseCategory,
        formData: {
          regulation: "หนังสือ ด่วนที่สุด ที่ กค (กวจ) 0405.2/ว119 ลงวันที่ 7 มีนาคม 2561",
          documentNo,
          memoDate,
          departmentName,
          phone,
          addressee,
          selectionCriteria,
          advanceRequired,
          inspectors: inspectors.filter(Boolean),
          budgetCodes: { sourceCode, departmentCode, fundCode, planCode, subprojectCode, activityCode },
          requiresItemAttachment: items.length > 10,
        },
        items: items.map((item, index) => ({
          line_no: index + 1,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unitPrice,
          market_price: item.marketPrice,
          price_source: item.priceSource,
        })),
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      router.push(`/requests/${result.requestNo}`);
      router.refresh();
    });
  }

  return (
    <AppShell>
      <PageHeader
        title="แบบฟอร์มขอซื้อขอจ้าง ว119"
        description="สร้างบันทึกข้อความ รายการพัสดุ และข้อมูลงบประมาณในชุดเดียว พร้อมส่งต่อเจ้าหน้าที่พัสดุตรวจสอบ"
      />

      <div className="mb-6 flex items-start gap-3 border border-orange-300 bg-orange-50 p-4 text-sm text-orange-950">
        <Info className="mt-0.5 shrink-0 text-[var(--orange)]" size={19} />
        <div><p className="font-bold">แบบฟอร์มตามหนังสือ ด่วนที่สุด ที่ กค (กวจ) 0405.2/ว119</p><p className="mt-1 leading-6 text-orange-900">ลงวันที่ 7 มีนาคม 2561 · ระบบจะนำข้อมูลชุดนี้ไปจัดทำบันทึกข้อความ รายการแนบ และรายงานสำหรับขั้นตอนพัสดุ</p></div>
      </div>

      <nav aria-label="ขั้นตอนการสร้างคำขอ" className="mb-6 overflow-x-auto border border-[var(--line-dark)] bg-white p-3">
        <ol className="flex min-w-[760px] items-center gap-2">
          {steps.map((label, index) => (
            <li key={label} className="flex flex-1 items-center gap-2">
              <button
                type="button"
                onClick={() => index < step && setStep(index)}
                disabled={index > step}
                className="flex min-h-11 flex-1 items-center gap-2 rounded-xl px-3 text-left disabled:cursor-not-allowed"
              >
                <span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${index < step ? "bg-emerald-100 text-emerald-700" : index === step ? "bg-orange-500 text-white" : "bg-slate-100 text-slate-400"}`}>
                  {index < step ? <Check size={15} /> : index + 1}
                </span>
                <span className={`text-sm font-semibold ${index === step ? "text-slate-900" : "text-slate-500"}`}>{label}</span>
              </button>
              {index < steps.length - 1 && <span aria-hidden="true" className="h-px w-5 bg-slate-200" />}
            </li>
          ))}
        </ol>
      </nav>

      {error && (
        <div role="alert" className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertCircle className="mt-0.5 shrink-0" size={18} />
          <span>{error}</span>
        </div>
      )}

      <SectionCard title={steps[step]} description={`ขั้นตอนที่ ${step + 1} จาก ${steps.length} · ข้อมูลจะถูกบันทึกในคำขอเดียวกัน`}>
        {step === 0 && (
          <div className="space-y-6">
            <div className="grid gap-5 border-b border-slate-200 pb-6 sm:grid-cols-2">
              <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">ส่วนงาน *</span><input className={inputClass} value={departmentName} onChange={(event) => setDepartmentName(event.target.value)} /></label>
              <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">โทรศัพท์ *</span><input className={inputClass} value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
              <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">ที่ / เลขที่หนังสือ *</span><input className={inputClass} value={documentNo} onChange={(event) => setDocumentNo(event.target.value)} /></label>
              <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">วันที่บันทึก *</span><input type="date" className={inputClass} value={memoDate} onChange={(event) => setMemoDate(event.target.value)} /></label>
              <label className="block sm:col-span-2"><span className="mb-2 block text-sm font-semibold text-slate-700">เรียน *</span><input className={inputClass} value={addressee} onChange={(event) => setAddressee(event.target.value)} /></label>
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-semibold text-slate-700">ประเภทคำขอ</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["purchase", "คำขอจัดซื้อ", "จัดหาพัสดุหรือครุภัณฑ์"],
                  ["hire", "คำขอจัดจ้าง", "จัดหางานจ้างหรือบริการ"],
                ].map(([value, label, description]) => (
                  <label key={value} className={`cursor-pointer rounded-xl border p-4 transition ${requestType === value ? "border-orange-400 bg-orange-50 ring-2 ring-orange-100" : "border-slate-200 hover:border-orange-200"}`}>
                    <span className="flex items-start gap-3">
                      <input type="radio" name="request-type" checked={requestType === value} onChange={() => setRequestType(value as "purchase" | "hire")} className="mt-1 accent-orange-500" />
                      <span><span className="block font-semibold text-slate-900">{label}</span><span className="mt-1 block text-sm text-slate-500">{description}</span></span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">เรื่อง ขอซื้อ/จ้าง *</span><input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">ความประสงค์ วัตถุประสงค์ และเหตุผลความจำเป็น *</span><textarea className={`${inputClass} min-h-28 resize-y`} value={rationale} onChange={(event) => setRationale(event.target.value)} /></label>
            <div className="grid gap-5 sm:grid-cols-2">
              <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">วันที่ต้องใช้พัสดุ/งานแล้วเสร็จ *</span><input type="date" className={inputClass} value={requiredDate} onChange={(event) => setRequiredDate(event.target.value)} /></label>
              <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">หลักเกณฑ์การพิจารณาคัดเลือก</span><select className={inputClass} value={selectionCriteria} onChange={(event) => setSelectionCriteria(event.target.value)}><option>เกณฑ์ราคา</option><option>เกณฑ์ราคาประกอบเกณฑ์อื่น</option></select></label>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[1080px] text-sm">
                <thead className="bg-slate-50 text-left text-slate-600"><tr><th className="p-3">รายการ/ขนาด/ลักษณะ</th><th className="w-24 p-3">จำนวน</th><th className="w-24 p-3">หน่วยนับ</th><th className="w-32 p-3">ราคาต่อหน่วย</th><th className="w-32 p-3">ราคากลาง</th><th className="w-44 p-3">แหล่งที่มาของราคา</th><th className="w-32 p-3 text-right">รวม</th><th className="w-14 p-3"><span className="sr-only">ลบ</span></th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="p-2"><input aria-label={`ชื่อรายการที่ ${index + 1}`} className={inputClass} value={item.description} onChange={(event) => updateItem(index, { description: event.target.value })} /></td>
                      <td className="p-2"><input aria-label={`จำนวนรายการที่ ${index + 1}`} type="number" min="0.01" step="0.01" className={inputClass} value={item.quantity} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} /></td>
                      <td className="p-2"><input aria-label={`หน่วยรายการที่ ${index + 1}`} className={inputClass} value={item.unit} onChange={(event) => updateItem(index, { unit: event.target.value })} /></td>
                      <td className="p-2"><input aria-label={`ราคาต่อหน่วยรายการที่ ${index + 1}`} type="number" min="0" step="0.01" className={inputClass} value={item.unitPrice} onChange={(event) => updateItem(index, { unitPrice: Number(event.target.value) })} /></td>
                      <td className="p-2"><input aria-label={`ราคากลางรายการที่ ${index + 1}`} type="number" min="0" step="0.01" className={inputClass} value={item.marketPrice} onChange={(event) => updateItem(index, { marketPrice: Number(event.target.value) })} /></td>
                      <td className="p-2"><input aria-label={`แหล่งที่มาของราคารายการที่ ${index + 1}`} className={inputClass} value={item.priceSource} onChange={(event) => updateItem(index, { priceSource: event.target.value })} /></td>
                      <td className="p-3 text-right font-semibold text-slate-800">{money(item.quantity * item.unitPrice)}</td>
                      <td className="p-2"><button type="button" aria-label={`ลบรายการที่ ${index + 1}`} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="grid size-10 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={17} /></button></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-orange-50"><tr><td colSpan={6} className="p-4 text-right font-semibold text-slate-700">รวม {items.length} รายการ</td><td className="p-4 text-right text-lg font-bold text-orange-700">{money(total)}</td><td /></tr></tfoot>
              </table>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button type="button" variant="secondary" onClick={() => setItems((current) => [...current, { description: "", quantity: 1, unit: "ชิ้น", unitPrice: 0, marketPrice: 0, priceSource: "" }])}><Plus size={17} /> เพิ่มรายการ</Button>
              <p className="text-sm text-slate-500">{items.length > 10 ? "ระบบจะสร้างเอกสารแนบรายการเกิน 10 รายการให้อัตโนมัติ" : `เพิ่มได้อีก ${10 - items.length} รายการก่อนแยกเป็นเอกสารแนบ`}</p>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">ปีงบประมาณ</span><select className={inputClass} value={fiscalYear} onChange={(event) => setFiscalYear(event.target.value)}><option>2567</option><option>2568</option><option>2569</option></select></label>
            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">แหล่งเงิน</span><select className={inputClass} value={fundSource} onChange={(event) => setFundSource(event.target.value)}><option>เงินงบประมาณแผ่นดิน</option><option>เงินรายได้</option></select></label>
            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">แผนงาน</span><input className={inputClass} value={planName} onChange={(event) => setPlanName(event.target.value)} /></label>
            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">หมวดรายจ่าย</span><select className={inputClass} value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value)}><option>ค่าวัสดุ</option><option>ค่าใช้สอย</option><option>ค่าครุภัณฑ์</option></select></label>
            <div className="sm:col-span-2 border-t border-slate-200 pt-5"><h3 className="font-bold text-slate-900">รหัสงบประมาณตามแบบฟอร์ม</h3><p className="mt-1 text-sm text-slate-500">ใช้สำหรับส่งต่อให้เจ้าหน้าที่การเงินตรวจสอบและคุมยอด</p></div>
            {[
              ["รหัสแหล่งเงิน", sourceCode, setSourceCode], ["รหัสหน่วยงาน", departmentCode, setDepartmentCode],
              ["รหัสกองทุน", fundCode, setFundCode], ["รหัสแผนงาน", planCode, setPlanCode],
              ["รหัสโครงการย่อย", subprojectCode, setSubprojectCode], ["รหัสกิจกรรม", activityCode, setActivityCode],
            ].map(([label, value, setter]) => <label key={label as string} className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{label as string}</span><input inputMode="numeric" className={inputClass} value={value as string} onChange={(event) => (setter as (value: string) => void)(event.target.value.replace(/\D/g, ""))} /></label>)}
            <div className="sm:col-span-2 border border-orange-200 bg-orange-50 p-5"><p className="text-sm font-semibold text-orange-900">วงเงินที่จะซื้อหรือจ้าง</p><p className="mt-1 text-2xl font-bold text-orange-700">{money(total)}</p><p className="mt-2 text-sm text-orange-800">เจ้าหน้าที่การเงินจะตรวจสอบและคุมยอดงบประมาณในขั้นตอนอนุมัติ</p></div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <fieldset>
              <legend className="mb-3 flex items-center gap-2 font-bold text-slate-900"><Users size={19} className="text-[var(--orange)]" /> ผู้ตรวจรับพัสดุ</legend>
              <p className="mb-4 text-sm text-slate-500">ระบุผู้ตรวจรับ 1 คน หรือคณะกรรมการไม่เกิน 3 คน เจ้าหน้าที่พัสดุสามารถปรับแก้ก่อนเสนออนุมัติ</p>
              <div className="grid gap-4 sm:grid-cols-3">{inspectors.map((name, index) => <label key={index} className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{index === 0 ? "ประธาน/ผู้ตรวจรับ" : `กรรมการคนที่ ${index}`}</span><input className={inputClass} value={name} placeholder="ชื่อ-นามสกุล" onChange={(event) => setInspectors((current) => current.map((value, itemIndex) => itemIndex === index ? event.target.value : value))} /></label>)}</div>
            </fieldset>
            <label className="flex cursor-pointer items-start gap-3 border border-slate-200 bg-slate-50 p-4">
              <input type="checkbox" checked={advanceRequired} onChange={(event) => setAdvanceRequired(event.target.checked)} className="mt-1 size-4 accent-orange-600" />
              <span><span className="block font-semibold text-slate-900">ขออนุมัติยืมเงินทดรองราชการ</span><span className="mt-1 block text-sm text-slate-500">เลือกเมื่อคำขอนี้ต้องดำเนินการยืมเงินตามส่วน (2) ของแบบฟอร์ม</span></span>
            </label>
            <div className="border-2 border-dashed border-slate-300 p-10 text-center">
              <Upload className="mx-auto text-orange-500" size={34} />
              <p className="mt-3 font-semibold text-slate-800">เอกสารประกอบคำขอ</p>
              <p className="mt-1 text-sm text-slate-500">แนบใบเสนอราคา รายละเอียดคุณลักษณะ หรือหลักฐานราคาที่สืบทราบ</p>
              <Button type="button" variant="secondary" className="mt-4" onClick={() => setUploaded(true)}>ทดลองเลือกไฟล์</Button>
            </div>
            {uploaded && <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><FileText className="text-orange-500" /><div className="flex-1"><p className="text-sm font-semibold">ใบเสนอราคา.pdf</p><p className="text-xs text-slate-500">ไฟล์ตัวอย่าง — ยังไม่ถูกอัปโหลด</p></div><span className="border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">ตัวอย่าง</span></div>}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div className="border border-slate-200 bg-slate-50 p-5"><p className="text-xs font-bold uppercase tracking-wider text-orange-600">{requestType === "purchase" ? "คำขอจัดซื้อ" : "คำขอจัดจ้าง"} · ว119</p><h3 className="mt-2 text-lg font-bold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{rationale}</p><p className="mt-4 border-t border-slate-200 pt-3 text-sm text-slate-600">{documentNo} · ลงวันที่ {memoDate} · เรียน {addressee}</p></div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div><dt className="text-sm text-slate-500">วันที่ต้องการใช้</dt><dd className="mt-1 font-semibold text-slate-900">{requiredDate}</dd></div>
              <div><dt className="text-sm text-slate-500">จำนวนรายการ</dt><dd className="mt-1 font-semibold text-slate-900">{items.length} รายการ</dd></div>
              <div><dt className="text-sm text-slate-500">แหล่งเงิน</dt><dd className="mt-1 font-semibold text-slate-900">{fundSource}</dd></div>
              <div><dt className="text-sm text-slate-500">ยอดรวม</dt><dd className="mt-1 text-xl font-bold text-orange-700">{money(total)}</dd></div>
              <div><dt className="text-sm text-slate-500">หลักเกณฑ์คัดเลือก</dt><dd className="mt-1 font-semibold text-slate-900">{selectionCriteria}</dd></div>
              <div><dt className="text-sm text-slate-500">ผู้ตรวจรับ</dt><dd className="mt-1 font-semibold text-slate-900">{inspectors.filter(Boolean).length || 0} คน</dd></div>
              <div><dt className="text-sm text-slate-500">รหัสงบประมาณ</dt><dd className="mt-1 font-semibold text-slate-900">{sourceCode} / {departmentCode} / {fundCode} / {planCode}</dd></div>
              <div><dt className="text-sm text-slate-500">การยืมเงินทดรองราชการ</dt><dd className="mt-1 font-semibold text-slate-900">{advanceRequired ? "ประสงค์ยืมเงิน" : "ไม่ประสงค์ยืมเงิน"}</dd></div>
            </dl>
            <div className="border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">เมื่อส่งคำขอ ระบบจะออกเลขเอกสารอัตโนมัติ บันทึกข้อมูลตามแบบ ว119 และสร้างงานตรวจสอบให้เจ้าหน้าที่พัสดุ</div>
          </div>
        )}

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
          {step === 0 ? <Link href="/requests"><Button type="button" variant="secondary"><ArrowLeft size={17} /> ยกเลิก</Button></Link> : <Button type="button" variant="secondary" onClick={() => { setError(""); setStep((current) => current - 1); }}><ArrowLeft size={17} /> ย้อนกลับ</Button>}
          {step < steps.length - 1 ? <Button type="button" onClick={goNext}>ถัดไป <ArrowRight size={17} /></Button> : <Button type="button" onClick={handleSubmit} disabled={isPending}>{isPending ? "กำลังส่งคำขอ..." : "ยืนยันและส่งคำขอ"} {!isPending && <Check size={17} />}</Button>}
        </div>
      </SectionCard>
    </AppShell>
  );
}
