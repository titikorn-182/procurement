import { AppShell } from "../../components/app-shell";
import { PageHeader } from "../../components/ui";
import { PaymentForm } from "./payment-form";
import { sarabunPsk } from "@/app/components/print/fonts";
import { getPayableSources } from "@/features/payments/server/form-queries";
export default async function NewPaymentPage() {
  const { requests, error: safeError } = await getPayableSources();
  return (
    <AppShell>
      <PageHeader
        title="สร้างคำขอเบิกจ่ายจัดซื้อจัดจ้าง"
        description="เลือกคำขอที่อนุมัติแล้วและส่งข้อมูลใบแจ้งหนี้เข้าสู่กระบวนการตรวจสอบ"
      />
      {safeError ? (
        <div
          role="alert"
          className="mt-5 border border-red-300 bg-[var(--red-soft)] p-4 text-[var(--red)]"
        >
          {safeError}
        </div>
      ) : (
        <PaymentForm requests={requests} printFontClassName={sarabunPsk.className} />
      )}
    </AppShell>
  );
}
