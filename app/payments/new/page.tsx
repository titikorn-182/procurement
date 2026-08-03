"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { AppShell } from "../../components/app-shell";
import { Check, ChevronLeft, ChevronRight, FileText, Paperclip, ReceiptText, Save, ShieldCheck, Upload, X } from "../../components/icons";
import { Button, Field, PageHeader, inputClass } from "../../components/ui";

const steps = ["เลือกคำขอหลักการ", "ข้อมูลใบแจ้งหนี้และภาษี", "หลักฐานส่งมอบ", "ตรวจสอบและส่ง"];
const approvalRoute = ["เจ้าหน้าที่พัสดุตรวจสอบ", "จัดทำรายงานขออนุมัติเบิกจ่าย", "หัวหน้าเจ้าหน้าที่พัสดุเห็นชอบ", "เจ้าหน้าที่การเงินคุมยอด", "รองคณบดีฝ่ายการเงินและพัสดุเห็นชอบ", "คณบดีเห็นชอบ", "หัวหน้าสำนักงานเลขานุการคณะเห็นชอบ", "ส่งวางฎีกา"];
const requests = {
  "PR6705-00038": { title: "จัดซื้อวัสดุสำนักงาน", approved: 30000, paid: 0, fund: "งบประมาณแผ่นดิน", vendor: "บริษัท สมาร์ทออฟฟิศ จำกัด" },
  "PR6705-00035": { title: "จ้างเหมาบริการซ่อมบำรุง", approved: 85000, paid: 25000, fund: "เงินรายได้", vendor: "ห้างหุ้นส่วนจำกัด ยูบีเทค" },
};

export default function NewPaymentPage() {
  const [step, setStep] = useState(0);
  const [requestId, setRequestId] = useState<keyof typeof requests>("PR6705-00038");
  const [invoice, setInvoice] = useState("");
  const [invoiceDate, setInvoiceDate] = useState("");
  const [subtotal, setSubtotal] = useState("23130.84");
  const [vat, setVat] = useState("1619.16");
  const [delivery, setDelivery] = useState("");
  const [uploaded, setUploaded] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const request = requests[requestId];
  const total = (Number(subtotal) || 0) + (Number(vat) || 0);
  const remaining = request.approved - request.paid;
  const overBudget = total > remaining;

  const next = () => {
    if (!formRef.current?.reportValidity()) return;
    if (step === 2 && !uploaded) { setNotice("กรุณาแนบใบแจ้งหนี้หรือหลักฐานตรวจรับอย่างน้อย 1 ไฟล์"); return; }
    setNotice(null);
    if (step < steps.length - 1) { setStep(step + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }
    else setNotice("ส่งคำขอเบิกจ่ายเข้าสู่ขั้นตอนเจ้าหน้าที่พัสดุตรวจสอบแล้ว (ข้อมูลจำลอง)");
  };

  return <AppShell>
    <PageHeader title="สร้างคำขอเบิกจ่ายจัดซื้อจัดจ้าง" description="เชื่อมโยงคำขอหลักการที่อนุมัติแล้ว เพื่อลดการกรอกข้อมูลซ้ำ" action={<Button variant="secondary" onClick={()=>setNotice("บันทึกร่างไว้ในอุปกรณ์นี้แล้ว (จำลอง)")}><Save size={17}/>บันทึกร่าง</Button>}/>
    {notice && <div role="status" className={`mt-4 flex items-center gap-3 border p-3 ${overBudget || (step===2&&!uploaded) ? "border-red-300 bg-[var(--red-soft)] text-[var(--red)]" : "border-green-300 bg-[var(--green-soft)] text-[var(--green)]"}`}><ShieldCheck size={18}/><span className="font-semibold">{notice}</span><button type="button" className="ml-auto p-1" onClick={()=>setNotice(null)} aria-label="ปิดข้อความ"><X size={17}/></button></div>}
    <ol className="mt-6 grid border border-[var(--line-dark)] bg-[var(--paper)] md:grid-cols-4" aria-label="ขั้นตอนสร้างคำขอเบิกจ่าย">{steps.map((label,index)=><li key={label} aria-current={index===step?"step":undefined} className={`flex items-center gap-3 border-b border-[var(--line)] p-4 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 ${index===step?"bg-[var(--orange)] text-white":index<step?"bg-[var(--green-soft)]":""}`}><span className={`flex h-7 w-7 shrink-0 items-center justify-center border ${index===step?"border-white":"border-[var(--line-dark)] bg-white text-[var(--ink)]"}`}>{index<step?<Check size={16}/>:index+1}</span><span className="text-sm font-semibold">{label}</span></li>)}</ol>

    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
      <form ref={formRef} onSubmit={(event)=>event.preventDefault()} className="border border-[var(--line-dark)] bg-[var(--paper)]">
        <div className="border-b border-[var(--line)] p-5"><h2 className="text-xl font-bold">{steps[step]}</h2><p className="mt-1 text-sm text-stone-600">ขั้นตอนที่ {step+1} จาก {steps.length} · ช่องที่มีเครื่องหมาย * จำเป็นต้องกรอก</p></div>
        <div className="p-5 sm:p-6">
          {step===0 && <div className="space-y-5"><Field label="คำขอหลักการที่อนุมัติแล้ว" required><select required value={requestId} onChange={(event)=>setRequestId(event.target.value as keyof typeof requests)} className={inputClass}><option value="PR6705-00038">PR6705-00038 · จัดซื้อวัสดุสำนักงาน</option><option value="PR6705-00035">PR6705-00035 · จ้างเหมาบริการซ่อมบำรุง</option></select></Field><section className="border border-[var(--line-dark)]"><h3 className="border-b border-[var(--line)] bg-stone-100 p-3 font-bold">ข้อมูลที่นำมาจากคำขอหลักการ</h3><dl className="grid gap-4 p-4 sm:grid-cols-2"><div><dt className="text-xs text-stone-500">ชื่อเรื่อง</dt><dd className="font-semibold">{request.title}</dd></div><div><dt className="text-xs text-stone-500">ผู้ขาย/ผู้รับจ้าง</dt><dd className="font-semibold">{request.vendor}</dd></div><div><dt className="text-xs text-stone-500">แหล่งเงิน</dt><dd className="font-semibold">{request.fund}</dd></div><div><dt className="text-xs text-stone-500">วงเงินที่ยังเบิกได้</dt><dd className="font-bold tabular-nums">{remaining.toLocaleString("th-TH",{minimumFractionDigits:2})} บาท</dd></div></dl></section></div>}
          {step===1 && <div className="grid gap-5 lg:grid-cols-2"><Field label="เลขที่ใบแจ้งหนี้" required><input required value={invoice} onChange={(event)=>setInvoice(event.target.value)} className={inputClass} placeholder="เช่น INV-2567-001"/></Field><Field label="วันที่ใบแจ้งหนี้" required><input required type="date" value={invoiceDate} onChange={(event)=>setInvoiceDate(event.target.value)} className={inputClass}/></Field><Field label="ยอดก่อนภาษี" required><input required min="0" type="number" step="0.01" value={subtotal} onChange={(event)=>setSubtotal(event.target.value)} className={inputClass}/></Field><Field label="ภาษีมูลค่าเพิ่ม"><input min="0" type="number" step="0.01" value={vat} onChange={(event)=>setVat(event.target.value)} className={inputClass}/></Field><div className={`lg:col-span-2 border p-4 ${overBudget?"border-red-300 bg-[var(--red-soft)]":"border-[var(--line-dark)] bg-stone-50"}`}><div className="flex flex-wrap items-center justify-between gap-2"><span className="font-semibold">ยอดเบิกจ่ายรวม</span><strong className={`text-xl tabular-nums ${overBudget?"text-[var(--red)]":"text-[var(--orange-dark)]"}`}>{total.toLocaleString("th-TH",{minimumFractionDigits:2})} บาท</strong></div>{overBudget&&<p className="mt-2 text-sm font-semibold text-[var(--red)]">ยอดเบิกสูงกว่ายอดคงเหลือ กรุณาปรับจำนวนเงินก่อนดำเนินการต่อ</p>}</div></div>}
          {step===2 && <div><Field label="รายละเอียดการส่งมอบและผลการตรวจรับ" required><textarea required value={delivery} onChange={(event)=>setDelivery(event.target.value)} className={`${inputClass} min-h-32 py-3`} placeholder="ระบุวันที่ส่งมอบ ผลการตรวจรับ และเลขที่เอกสารที่เกี่ยวข้อง"/></Field><div className="mt-5 border-2 border-dashed border-[var(--line-dark)] bg-stone-50 p-8 text-center"><Upload className="mx-auto" size={30}/><h3 className="mt-3 font-bold">แนบใบแจ้งหนี้และหลักฐานตรวจรับ</h3><p className="mt-1 text-sm text-stone-600">รองรับ PDF, JPG และ PNG ขนาดไม่เกิน 20 MB ต่อไฟล์ · การอัปโหลดเป็นข้อมูลจำลอง</p><Button variant="secondary" className="mt-4" onClick={()=>{setUploaded(true);setNotice(null);}}><Paperclip size={17}/>เลือกไฟล์ตัวอย่าง</Button></div>{uploaded&&<div className="mt-3 flex items-center gap-3 border border-green-300 bg-[var(--green-soft)] p-3"><FileText size={18}/><div className="min-w-0 flex-1"><div className="truncate font-semibold">ใบแจ้งหนี้และใบตรวจรับ.pdf</div><div className="text-xs text-[var(--green)]">560 KB · พร้อมส่ง</div></div><button type="button" onClick={()=>setUploaded(false)} className="p-2" aria-label="ลบไฟล์ตัวอย่าง"><X size={17}/></button></div>}</div>}
          {step===3 && <div className="grid gap-5 lg:grid-cols-[1fr_300px]"><div className="space-y-5"><section className="border border-[var(--line)]"><h3 className="border-b border-[var(--line)] bg-stone-100 p-3 font-bold">รายการอ้างอิง</h3><dl className="grid gap-4 p-4 sm:grid-cols-2"><div><dt className="text-xs text-stone-500">คำขอหลักการ</dt><dd className="font-semibold">{requestId}</dd></div><div><dt className="text-xs text-stone-500">ชื่อเรื่อง</dt><dd className="font-semibold">{request.title}</dd></div><div><dt className="text-xs text-stone-500">ใบแจ้งหนี้</dt><dd className="font-semibold">{invoice}</dd></div><div><dt className="text-xs text-stone-500">วันที่ใบแจ้งหนี้</dt><dd className="font-semibold">{invoiceDate}</dd></div></dl></section><section className="border border-[var(--line)] p-4"><h3 className="font-bold">หลักฐานและการส่งมอบ</h3><p className="mt-2 text-sm">แนบเอกสาร 1 ไฟล์ · {delivery}</p></section></div><aside className="border border-[var(--orange)] bg-[var(--orange-soft)] p-5"><h3 className="font-bold">ยอดขอเบิกจ่าย</h3><div className="mt-3 text-2xl font-bold tabular-nums text-[var(--orange-dark)]">{total.toLocaleString("th-TH",{minimumFractionDigits:2})} บาท</div><p className="mt-3 text-sm">เมื่อยืนยัน ระบบจะออกเลขคำขอเบิกจ่ายและส่งให้เจ้าหน้าที่พัสดุตรวจสอบ</p></aside></div>}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] bg-stone-50 p-4"><Link href="/requests" className="inline-flex min-h-10 items-center gap-2 px-3 font-semibold hover:underline"><ChevronLeft size={17}/>ยกเลิกและกลับ</Link><div className="flex gap-2">{step>0&&<Button variant="secondary" onClick={()=>{setNotice(null);setStep(step-1);}}><ChevronLeft size={17}/>ย้อนกลับ</Button>}<Button disabled={overBudget} onClick={next}>{step===steps.length-1?<Check size={17}/>:null}{step===steps.length-1?"ยืนยันและส่งคำขอ":"บันทึกและไปต่อ"}<ChevronRight size={17}/></Button></div></div>
      </form>

      <aside className="space-y-4"><section className="border border-[var(--line-dark)] bg-[var(--paper)]"><div className="flex items-center gap-3 border-b border-[var(--line)] p-4"><ReceiptText/><h2 className="text-lg font-bold">ยอดที่เบิกได้</h2></div><dl><div className="flex justify-between border-b border-[var(--line)] p-4"><dt>วงเงินอนุมัติ</dt><dd className="font-bold tabular-nums">{request.approved.toLocaleString("th-TH",{minimumFractionDigits:2})}</dd></div><div className="flex justify-between border-b border-[var(--line)] p-4"><dt>เบิกสะสมแล้ว</dt><dd className="font-bold tabular-nums">{request.paid.toLocaleString("th-TH",{minimumFractionDigits:2})}</dd></div><div className="flex justify-between bg-[var(--green-soft)] p-4"><dt className="font-semibold">ยอดคงเหลือ</dt><dd className="text-xl font-bold tabular-nums text-[var(--green)]">{remaining.toLocaleString("th-TH",{minimumFractionDigits:2})}</dd></div></dl></section><section className="border border-[var(--line-dark)] bg-[var(--paper)]"><div className="border-b border-[var(--line)] p-4"><h2 className="font-bold">เส้นทางหลังส่งคำขอ</h2><p className="mt-1 text-xs text-stone-500">8 ขั้นตอนตาม requirement · สถานะจำลอง</p></div><ol className="divide-y divide-[var(--line)]">{approvalRoute.map((label,index)=><li key={label} className="flex gap-3 p-3 text-sm"><span className="flex h-6 w-6 shrink-0 items-center justify-center border border-[var(--line-dark)] bg-stone-50 text-xs font-bold">{index+1}</span><span className="font-medium">{label}</span></li>)}</ol></section></aside>
    </div>
  </AppShell>;
}
