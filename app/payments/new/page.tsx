import { AppShell } from "../../components/app-shell";
import { PageHeader } from "../../components/ui";
import { createClient } from "@/lib/supabase/server";
import { PaymentForm } from "./payment-form";

export default async function NewPaymentPage() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("procurement_requests").select("id, request_no, title, estimated_amount, fund_source, status, payment_requests(total_amount,status)").in("status",["approved","ordered","completed"]).order("created_at",{ascending:false});
  const requests=(data??[]).map((row)=>{const paid=(row.payment_requests??[]).filter((p)=>p.status!=="cancelled").reduce((sum,p)=>sum+Number(p.total_amount),0);return {id:row.id,requestNo:row.request_no,title:row.title,fundSource:row.fund_source,approved:Number(row.estimated_amount),paid};});
  return <AppShell><PageHeader title="สร้างคำขอเบิกจ่ายจัดซื้อจัดจ้าง" description="เลือกคำขอที่อนุมัติแล้วและส่งข้อมูลใบแจ้งหนี้เข้าสู่กระบวนการตรวจสอบ"/>{error?<div role="alert" className="mt-5 border border-red-300 bg-[var(--red-soft)] p-4 text-[var(--red)]">{error.message}</div>:<PaymentForm requests={requests}/>}</AppShell>;
}
