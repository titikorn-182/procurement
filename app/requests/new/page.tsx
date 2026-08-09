"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { AlertCircle, ArrowLeft, ArrowRight, Check, FileText, Plus, Trash2, Upload } from "lucide-react";
import { Button, PageHeader } from "../../components/ui";
import { submitRequest } from "./actions";

type RequestItem = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

const steps = ["ข้อมูลคำขอ", "รายการพัสดุ", "งบประมาณ", "เอกสารแนบ", "ตรวจสอบและส่ง"];

const initialItems: RequestItem[] = [
  { description: "กระดาษถ่ายเอกสาร A4 80 แกรม", quantity: 10, unit: "รีม", unitPrice: 120 },
  { description: "แฟ้มสันกว้าง 3 นิ้ว", quantity: 20, unit: "เล่ม", unitPrice: 75 },
  { description: "ปากกาลูกลื่นสีน้ำเงิน", quantity: 50, unit: "ด้าม", unitPrice: 8 },
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
  const [title, setTitle] = useState("จัดซื้อวัสดุสำนักงานประจำปีงบประมาณ 2567");
  const [rationale, setRationale] = useState("เพื่อสนับสนุนการปฏิบัติงานของหน่วยงานให้เป็นไปอย่างต่อเนื่อง");
  const [requiredDate, setRequiredDate] = useState("");
  const [items, setItems] = useState<RequestItem[]>(initialItems);
  const [fiscalYear, setFiscalYear] = useState("2567");
  const [fundSource, setFundSource] = useState("เงินงบประมาณแผ่นดิน");
  const [planName, setPlanName] = useState("แผนงานบริหารทั่วไป");
  const [expenseCategory, setExpenseCategory] = useState("ค่าวัสดุ");
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
    if (step === 0 && (!title.trim() || !rationale.trim() || !requiredDate)) {
      return "กรุณากรอกชื่อคำขอ เหตุผลความจำเป็น และวันที่ต้องการใช้";
    }
    if (step === 1 && (items.length === 0 || items.some((item) => !item.description.trim() || !item.unit.trim() || item.quantity <= 0 || item.unitPrice < 0))) {
      return "กรุณากรอกรายการพัสดุให้ครบถ้วนอย่างน้อย 1 รายการ";
    }
    if (step === 2 && (!fiscalYear || !fundSource || !planName || !expenseCategory)) {
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
        items: items.map((item, index) => ({
          line_no: index + 1,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unitPrice,
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
        title="สร้างคำขอใหม่"
        description="กรอกข้อมูลให้ครบ ระบบจะออกเลขคำขอและส่งต่อให้เจ้าหน้าที่พัสดุตรวจสอบ"
      />

      <nav aria-label="ขั้นตอนการสร้างคำขอ" className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
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

      <SectionCard title={steps[step]} description={`ขั้นตอนที่ ${step + 1} จาก ${steps.length}`}>
        {step === 0 && (
          <div className="space-y-6">
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
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">หน่วยงานผู้ขอจะถูกดึงจากโปรไฟล์ผู้เข้าสู่ระบบโดยอัตโนมัติ</div>
            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">ชื่อเรื่องคำขอ *</span><input className={inputClass} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">เหตุผลและความจำเป็น *</span><textarea className={`${inputClass} min-h-28 resize-y`} value={rationale} onChange={(event) => setRationale(event.target.value)} /></label>
            <label className="block max-w-md"><span className="mb-2 block text-sm font-semibold text-slate-700">วันที่ต้องการใช้ *</span><input type="date" className={inputClass} value={requiredDate} onChange={(event) => setRequiredDate(event.target.value)} /></label>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="bg-slate-50 text-left text-slate-600"><tr><th className="p-3">รายการ</th><th className="w-24 p-3">จำนวน</th><th className="w-28 p-3">หน่วย</th><th className="w-36 p-3">ราคาต่อหน่วย</th><th className="w-32 p-3 text-right">รวม</th><th className="w-14 p-3"><span className="sr-only">ลบ</span></th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, index) => (
                    <tr key={index}>
                      <td className="p-2"><input aria-label={`ชื่อรายการที่ ${index + 1}`} className={inputClass} value={item.description} onChange={(event) => updateItem(index, { description: event.target.value })} /></td>
                      <td className="p-2"><input aria-label={`จำนวนรายการที่ ${index + 1}`} type="number" min="0.01" step="0.01" className={inputClass} value={item.quantity} onChange={(event) => updateItem(index, { quantity: Number(event.target.value) })} /></td>
                      <td className="p-2"><input aria-label={`หน่วยรายการที่ ${index + 1}`} className={inputClass} value={item.unit} onChange={(event) => updateItem(index, { unit: event.target.value })} /></td>
                      <td className="p-2"><input aria-label={`ราคาต่อหน่วยรายการที่ ${index + 1}`} type="number" min="0" step="0.01" className={inputClass} value={item.unitPrice} onChange={(event) => updateItem(index, { unitPrice: Number(event.target.value) })} /></td>
                      <td className="p-3 text-right font-semibold text-slate-800">{money(item.quantity * item.unitPrice)}</td>
                      <td className="p-2"><button type="button" aria-label={`ลบรายการที่ ${index + 1}`} onClick={() => setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))} className="grid size-10 place-items-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={17} /></button></td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-orange-50"><tr><td colSpan={4} className="p-4 text-right font-semibold text-slate-700">ยอดรวมทั้งสิ้น</td><td className="p-4 text-right text-lg font-bold text-orange-700">{money(total)}</td><td /></tr></tfoot>
              </table>
            </div>
            <Button type="button" variant="secondary" onClick={() => setItems((current) => [...current, { description: "", quantity: 1, unit: "ชิ้น", unitPrice: 0 }])}><Plus size={17} /> เพิ่มรายการ</Button>
          </div>
        )}

        {step === 2 && (
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">ปีงบประมาณ</span><select className={inputClass} value={fiscalYear} onChange={(event) => setFiscalYear(event.target.value)}><option>2567</option><option>2568</option><option>2569</option></select></label>
            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">แหล่งเงิน</span><select className={inputClass} value={fundSource} onChange={(event) => setFundSource(event.target.value)}><option>เงินงบประมาณแผ่นดิน</option><option>เงินรายได้</option></select></label>
            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">แผนงาน</span><input className={inputClass} value={planName} onChange={(event) => setPlanName(event.target.value)} /></label>
            <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">หมวดรายจ่าย</span><select className={inputClass} value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value)}><option>ค่าวัสดุ</option><option>ค่าใช้สอย</option><option>ค่าครุภัณฑ์</option></select></label>
            <div className="sm:col-span-2 rounded-xl border border-orange-200 bg-orange-50 p-5"><p className="text-sm font-semibold text-orange-900">ยอดคำขอนี้</p><p className="mt-1 text-2xl font-bold text-orange-700">{money(total)}</p><p className="mt-2 text-sm text-orange-800">เจ้าหน้าที่การเงินจะตรวจสอบและคุมยอดงบประมาณในขั้นตอนอนุมัติ</p></div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-2xl border-2 border-dashed border-slate-300 p-10 text-center">
              <Upload className="mx-auto text-orange-500" size={34} />
              <p className="mt-3 font-semibold text-slate-800">เอกสารประกอบคำขอ</p>
              <p className="mt-1 text-sm text-slate-500">การจัดเก็บไฟล์จริงจะเปิดใช้งานในรุ่นถัดไป จึงยังไม่ส่งไฟล์ไปยัง Supabase Storage</p>
              <Button type="button" variant="secondary" className="mt-4" onClick={() => setUploaded(true)}>ทดลองเลือกไฟล์</Button>
            </div>
            {uploaded && <div className="flex items-center gap-3 rounded-xl border border-slate-200 p-4"><FileText className="text-orange-500" /><div className="flex-1"><p className="text-sm font-semibold">ใบเสนอราคา.pdf</p><p className="text-xs text-slate-500">ไฟล์ตัวอย่าง — ยังไม่ถูกอัปโหลด</p></div><span className="border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-800">ตัวอย่าง</span></div>}
          </div>
        )}

        {step === 4 && (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5"><p className="text-xs font-bold uppercase tracking-wider text-orange-600">{requestType === "purchase" ? "คำขอจัดซื้อ" : "คำขอจัดจ้าง"}</p><h3 className="mt-2 text-lg font-bold text-slate-900">{title}</h3><p className="mt-2 text-sm leading-6 text-slate-600">{rationale}</p></div>
            <dl className="grid gap-4 sm:grid-cols-2">
              <div><dt className="text-sm text-slate-500">วันที่ต้องการใช้</dt><dd className="mt-1 font-semibold text-slate-900">{requiredDate}</dd></div>
              <div><dt className="text-sm text-slate-500">จำนวนรายการ</dt><dd className="mt-1 font-semibold text-slate-900">{items.length} รายการ</dd></div>
              <div><dt className="text-sm text-slate-500">แหล่งเงิน</dt><dd className="mt-1 font-semibold text-slate-900">{fundSource}</dd></div>
              <div><dt className="text-sm text-slate-500">ยอดรวม</dt><dd className="mt-1 text-xl font-bold text-orange-700">{money(total)}</dd></div>
            </dl>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">เมื่อส่งคำขอ ระบบจะออกเลขเอกสารอัตโนมัติและสร้างงานตรวจสอบให้เจ้าหน้าที่พัสดุ</div>
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
