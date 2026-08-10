"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "../../components/app-shell";
import { AlertCircle, ArrowLeft, ArrowRight, BookOpen, Check, FileText, Plus, Trash2, Upload, X } from "lucide-react";
import { Button, PageHeader } from "../../components/ui";
import { submitRequest } from "./actions";
import { VendorPicker, type VendorChoice } from "./vendor-picker";

type RequestItem = {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
};

type LoanRequirement =
  | "borrow_before_purchase"
  | "reimburse_after_purchase"
  | "faculty_direct_pay_credit_vendor";

const loanRequirementOptions: Array<{ value: LoanRequirement; label: string }> = [
  {
    value: "borrow_before_purchase",
    label: "ต้องการยืมเงินก่อน (ต้องแนบสัญญายืมในเอกสารแนบ)",
  },
  {
    value: "reimburse_after_purchase",
    label: "ไม่ต้องการยืมเงิน (จัดซื้อ/จ้างมาก่อนและทำการเบิก)",
  },
  {
    value: "faculty_direct_pay_credit_vendor",
    label: "ไม่ต้องการยืมเงิน (มอบงานพัสดุจัดซื้อ/จ้าง กรณีร้านค้าให้เครดิตคณะและจ่ายตรงกับร้านค้า)",
  },
];

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
  const [title, setTitle] = useState("จัดซื้อวัสดุสำนักงานประจำปีงบประมาณ 2569");
  const [rationale, setRationale] = useState("เพื่อสนับสนุนการปฏิบัติงานของหน่วยงานให้เป็นไปอย่างต่อเนื่อง");
  const [requiredDate, setRequiredDate] = useState("");
  const [items, setItems] = useState<RequestItem[]>(initialItems);
  const [catalogOpen, setCatalogOpen] = useState(false);
  const [fiscalYear, setFiscalYear] = useState("2569");
  const [fundSource, setFundSource] = useState("เงินงบประมาณแผ่นดิน");
  const [planName, setPlanName] = useState("แผนงานบริหารทั่วไป");
  const [expenseCategory, setExpenseCategory] = useState("ค่าวัสดุ");
  const [loanRequirement, setLoanRequirement] = useState<LoanRequirement | "">("");
  const [vendorSelection, setVendorSelection] = useState<VendorChoice>({ kind: "none" });
  const [newVendorName, setNewVendorName] = useState("");
  const [budgetDetailsOpen, setBudgetDetailsOpen] = useState(true);
  const [departmentCode, setDepartmentCode] = useState("");
  const [fundCode, setFundCode] = useState("");
  const [activityCode, setActivityCode] = useState("");
  const [uploaded, setUploaded] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items],
  );
  const selectedLoanLabel = loanRequirementOptions.find((option) => option.value === loanRequirement)?.label ?? "ยังไม่ได้เลือก";
  const selectedVendorName = vendorSelection.kind === "new"
    ? newVendorName.trim() || "ผู้ประกอบการรายใหม่"
    : vendorSelection.kind === "registered"
      ? vendorSelection.vendorName
      : "ไม่ได้ระบุ";
  const budgetCodesComplete = Boolean(departmentCode.trim() && fundCode.trim() && activityCode.trim());
  const vendorErrorMessage = error.includes("ผู้ประกอบการ") ? error : undefined;

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
    if (step === 2 && (!fiscalYear || !fundSource || !planName.trim() || !expenseCategory)) {
      return "กรุณาระบุข้อมูลงบประมาณให้ครบถ้วน";
    }
    if (step === 2 && !loanRequirement) {
      return "กรุณาเลือกความต้องการยืมเงินก่อนดำเนินการต่อ";
    }
    if (step === 2 && loanRequirement === "faculty_direct_pay_credit_vendor" && vendorSelection.kind === "none") {
      return "กรุณาเลือกผู้ประกอบการหรือร้านค้าสำหรับกรณีจ่ายตรงกับร้านค้า";
    }
    if (step === 2 && vendorSelection.kind === "new" && !newVendorName.trim()) {
      return "กรุณาระบุชื่อผู้ประกอบการหรือร้านค้ารายใหม่";
    }
    if (step === 2 && !budgetCodesComplete) {
      setBudgetDetailsOpen(true);
      return "กรุณากรอกรหัสหน่วยงาน รหัสกองทุน และรหัสกิจกรรมให้ครบถ้วน";
    }
    return "";
  }

  function goNext() {
    const validationError = validateCurrentStep();
    if (validationError) {
      setError(validationError);
      window.scrollTo({ top: 0, behavior: "smooth" });
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
          advanceFundingOption: loanRequirement,
          requiresLoanAgreement: loanRequirement === "borrow_before_purchase",
          vendor: vendorSelection.kind !== "none"
            ? {
                type: vendorSelection.kind,
                id: vendorSelection.kind === "registered" ? vendorSelection.vendorId : null,
                name: vendorSelection.kind === "new" ? newVendorName.trim() : null,
              }
            : null,
          requiresVendorDocuments: vendorSelection.kind === "new",
          budgetCodes: {
            departmentCode: departmentCode.trim(),
            fundCode: fundCode.trim(),
            activityCode: activityCode.trim(),
          },
        },
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
            <div className="flex flex-wrap gap-3">
              <Button type="button" variant="secondary" onClick={() => setItems((current) => [...current, { description: "", quantity: 1, unit: "ชิ้น", unitPrice: 0 }])}><Plus size={17} /> เพิ่มรายการ</Button>
              <Button type="button" variant="secondary" aria-expanded={catalogOpen} aria-controls="reference-price-catalog" onClick={() => setCatalogOpen((current) => !current)}><BookOpen size={17} /> แค็ตตาล็อกราคากลาง</Button>
            </div>
            {catalogOpen && <section id="reference-price-catalog" className="border border-[var(--line-dark)] bg-stone-50" aria-labelledby="reference-price-catalog-heading"><header className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-4 py-3"><div><h3 id="reference-price-catalog-heading" className="font-bold">แค็ตตาล็อกราคากลาง</h3><p className="mt-1 text-sm text-stone-600">ค้นหาและเลือกรายการจากฐานข้อมูลราคากลางของหน่วยงาน</p></div><button type="button" onClick={() => setCatalogOpen(false)} className="grid min-h-10 min-w-10 place-items-center border border-[var(--line)] bg-white hover:bg-stone-100" aria-label="ปิดแค็ตตาล็อกราคากลาง"><X size={17} /></button></header><div className="p-6 text-center"><BookOpen className="mx-auto text-stone-400" size={30} aria-hidden="true"/><p className="mt-3 font-semibold">ยังไม่มีข้อมูลราคากลางในระบบ</p><p className="mx-auto mt-1 max-w-2xl text-sm text-stone-600">ต้องเชื่อมข้อมูลรายการ ราคา หน่วยนับ วันที่อ้างอิง และแหล่งที่มาที่ได้รับการรับรองก่อนเปิดให้เลือกใช้ เพื่อไม่ให้ระบบแสดงราคาที่ไม่เป็นปัจจุบัน</p></div></section>}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">ปีงบประมาณ</span><select className={inputClass} value={fiscalYear} onChange={(event) => setFiscalYear(event.target.value)}><option>2567</option><option>2568</option><option>2569</option><option>2570</option></select></label>
              <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">แผนงาน</span><input className={inputClass} value={planName} onChange={(event) => setPlanName(event.target.value)} /></label>
              <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">หมวดรายจ่าย</span><select className={inputClass} value={expenseCategory} onChange={(event) => setExpenseCategory(event.target.value)}><option>ค่าวัสดุ</option><option>ค่าใช้สอย</option><option>ค่าครุภัณฑ์</option></select></label>
            </div>

            <fieldset className="border border-slate-200 bg-white p-5">
              <legend className="sr-only">ความต้องการยืมเงินก่อน</legend>
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center bg-orange-600 text-sm font-bold text-white">1</span>
                <div>
                  <h3 className="font-bold text-slate-900">ความต้องการยืมเงินก่อน <span className="text-red-600">*</span></h3>
                  <p className="mt-1 text-sm text-slate-500">เลือกแนวทางการชำระเงินให้ตรงกับการดำเนินการของคำขอนี้</p>
                </div>
              </div>
              <div className="mt-4 grid gap-3 lg:grid-cols-3">
                {loanRequirementOptions.map((option) => {
                  const selected = loanRequirement === option.value;
                  return (
                    <label key={option.value} className={`flex cursor-pointer items-start gap-3 border p-4 transition ${selected ? "border-orange-500 bg-orange-50 ring-2 ring-orange-100" : "border-slate-200 bg-white hover:border-orange-300 hover:bg-orange-50/40"}`}>
                      <input
                        type="radio"
                        name="loan-requirement"
                        value={option.value}
                        checked={selected}
                        onChange={() => setLoanRequirement(option.value)}
                        required
                        className="mt-1 size-4 shrink-0 accent-orange-600"
                      />
                      <span className="text-sm font-medium leading-6 text-slate-800">{option.label}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <section className="border border-slate-200 bg-white p-5" aria-labelledby="vendor-selection-heading">
              <div className="flex items-start gap-3">
                <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center bg-orange-600 text-sm font-bold text-white">2</span>
                <div>
                  <h3 id="vendor-selection-heading" className="font-bold text-slate-900">เลือกผู้ประกอบการ/ร้านที่ต้องการซื้อ/จ้าง (โดยวิธีเฉพาะเจาะจง)</h3>
                  <p className="mt-1 text-sm text-slate-500">ค้นหาและเลือกจากฐานรายชื่อผู้ประกอบการเดิม หรือระบุรายใหม่หากค้นหาไม่พบ</p>
                </div>
              </div>
              <VendorPicker
                value={vendorSelection}
                onChange={(value) => {
                  setVendorSelection(value);
                  if (vendorErrorMessage) setError("");
                }}
                newVendorName={newVendorName}
                onNewVendorNameChange={(value) => {
                  setNewVendorName(value);
                  if (vendorErrorMessage) setError("");
                }}
                required={loanRequirement === "faculty_direct_pay_credit_vendor"}
                errorMessage={vendorErrorMessage}
              />
            </section>

            <section className="border border-slate-200 bg-white">
              <button
                type="button"
                className="flex min-h-16 w-full items-center justify-between gap-4 p-5 text-left transition hover:bg-slate-50"
                aria-expanded={budgetDetailsOpen}
                aria-controls="budget-source-details"
                onClick={() => setBudgetDetailsOpen((current) => !current)}
              >
                <span className="flex items-start gap-3">
                  <span aria-hidden="true" className="grid size-8 shrink-0 place-items-center bg-orange-600 text-sm font-bold text-white">3</span>
                  <span>
                    <span className="block font-bold text-slate-900">รายละเอียดแหล่งงบประมาณ</span>
                    <span className="mt-1 block text-sm font-normal text-slate-500">ระบุแหล่งเงินทุนและรหัสงบประมาณของคำขอ</span>
                  </span>
                </span>
                <span className={`shrink-0 px-3 py-1 text-xs font-bold ${budgetCodesComplete ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>
                  {budgetDetailsOpen ? "ซ่อนรายละเอียด" : budgetCodesComplete ? "ข้อมูลครบแล้ว" : "กรอกข้อมูล"}
                </span>
              </button>
              {budgetDetailsOpen && (
                <div id="budget-source-details" className="grid gap-5 border-t border-slate-200 bg-slate-50/70 p-5 sm:grid-cols-2">
                  <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">แหล่งเงินทุน <span className="text-red-600">*</span></span><select className={inputClass} value={fundSource} onChange={(event) => setFundSource(event.target.value)} required><option>เงินงบประมาณแผ่นดิน</option><option>เงินรายได้</option></select></label>
                  <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">รหัสหน่วยงาน <span className="text-red-600">*</span></span><input className={inputClass} value={departmentCode} onChange={(event) => setDepartmentCode(event.target.value)} placeholder="กรอกรหัสหน่วยงาน" required /></label>
                  <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">รหัสกองทุน <span className="text-red-600">*</span></span><input className={inputClass} value={fundCode} onChange={(event) => setFundCode(event.target.value)} placeholder="กรอกรหัสกองทุน" required /></label>
                  <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">รหัสกิจกรรม <span className="text-red-600">*</span></span><input className={inputClass} value={activityCode} onChange={(event) => setActivityCode(event.target.value)} placeholder="กรอกรหัสกิจกรรม" required /></label>
                </div>
              )}
            </section>

            <div className="border border-orange-200 bg-orange-50 p-5"><p className="text-sm font-semibold text-orange-900">ยอดคำขอนี้</p><p className="mt-1 text-2xl font-bold text-orange-700">{money(total)}</p><p className="mt-2 text-sm text-orange-800">เจ้าหน้าที่การเงินจะตรวจสอบและคุมยอดงบประมาณในขั้นตอนอนุมัติ</p></div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            {(loanRequirement === "borrow_before_purchase" || vendorSelection.kind === "new") && (
              <section role="status" className="border border-amber-300 bg-amber-50 p-4 text-amber-950" aria-labelledby="required-attachments-heading">
                <div className="flex items-start gap-3">
                  <AlertCircle className="mt-0.5 shrink-0 text-amber-700" size={19} aria-hidden="true" />
                  <div>
                    <h3 id="required-attachments-heading" className="font-bold">เอกสารที่ต้องแนบตามข้อมูลที่เลือก</h3>
                    <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-6">
                      {loanRequirement === "borrow_before_purchase" && <li>สัญญายืมเงินสำหรับกรณีต้องการยืมเงินก่อน</li>}
                      {vendorSelection.kind === "new" && <li>เอกสารของผู้ประกอบการ/ผู้รับจ้างรายใหม่ เพื่อให้เจ้าหน้าที่พัสดุตรวจสอบ</li>}
                    </ul>
                  </div>
                </div>
              </section>
            )}
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
              <div><dt className="text-sm text-slate-500">ความต้องการยืมเงิน</dt><dd className="mt-1 font-semibold leading-6 text-slate-900">{selectedLoanLabel}</dd></div>
              <div><dt className="text-sm text-slate-500">ผู้ประกอบการ/ร้านค้า</dt><dd className="mt-1 font-semibold text-slate-900">{selectedVendorName}</dd></div>
              <div><dt className="text-sm text-slate-500">แหล่งเงินทุน</dt><dd className="mt-1 font-semibold text-slate-900">{fundSource}</dd></div>
              <div><dt className="text-sm text-slate-500">รหัสหน่วยงาน</dt><dd className="mt-1 font-semibold text-slate-900">{departmentCode}</dd></div>
              <div><dt className="text-sm text-slate-500">รหัสกองทุน</dt><dd className="mt-1 font-semibold text-slate-900">{fundCode}</dd></div>
              <div><dt className="text-sm text-slate-500">รหัสกิจกรรม</dt><dd className="mt-1 font-semibold text-slate-900">{activityCode}</dd></div>
              <div><dt className="text-sm text-slate-500">ยอดรวม</dt><dd className="mt-1 text-xl font-bold text-orange-700">{money(total)}</dd></div>
            </dl>
            {(loanRequirement === "borrow_before_purchase" || vendorSelection.kind === "new") && (
              <div className="border border-amber-300 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                โปรดตรวจสอบว่าได้เตรียม{loanRequirement === "borrow_before_purchase" ? "สัญญายืมเงิน" : ""}{loanRequirement === "borrow_before_purchase" && vendorSelection.kind === "new" ? " และ" : ""}{vendorSelection.kind === "new" ? "เอกสารผู้ประกอบการ/ผู้รับจ้างรายใหม่" : ""}ไว้ในเอกสารแนบแล้ว
              </div>
            )}
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
