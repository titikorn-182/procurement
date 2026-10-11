import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import { PageHeader } from "@/app/components/ui";
import { createClient } from "@/lib/supabase/server";
import { sarabunPsk } from "@/app/components/print/fonts";
import { getPayment, getPaymentAccess } from "../../data";
import { record, restorePayment, paymentHref } from "../../payment-model";
import { PaymentForm } from "../../new/payment-form";
import { pol02SupportingChecklistSchema } from "../../new/pol02-checklist-schema";

export default async function EditPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params,
    { data: payment, error } = await getPayment(id);
  if (!payment && !error) notFound();
  if (!payment) throw new Error("payment unavailable");
  const { owner } = await getPaymentAccess(payment),
    form = record(payment.form_data);
  if (!owner || !["draft", "returned"].includes(payment.status) || form.formType !== "pol02")
    return (
      <AppShell>
        <PageHeader
          title="ไม่สามารถแก้ไขคำขอนี้ได้"
          description="เฉพาะเจ้าของคำขอที่เป็นฉบับร่างหรือถูกส่งกลับแก้ไขเท่านั้น"
        />
        <Link href={paymentHref(id)} className="mt-5 inline-block underline">
          กลับหน้าคำขอ
        </Link>
      </AppShell>
    );
  const supabase = await createClient();
  const { data: otherPayments, error: balanceError } = await supabase
    .from("payment_requests")
    .select("total_amount")
    .eq("procurement_request_id", payment.procurement_request_id)
    .neq("id", payment.id)
    .not("status", "in", "(cancelled,draft)");
  if (balanceError) throw new Error("payment balance unavailable");
  const { source, details, lines } = restorePayment(payment);
  source.paid = (otherPayments ?? []).reduce((sum, row) => sum + Number(row.total_amount), 0);
  const checklist = pol02SupportingChecklistSchema.safeParse(form.supportingDocumentChecklist);
  return (
    <AppShell>
      <PageHeader
        title={`แก้ไข ${payment.payment_no}`}
        description="บันทึกข้อมูลในคำขอเดิม เอกสารแนบเดิมยังอยู่จนกว่าจะเลือกนำออกและบันทึก"
      />
      <Link href={paymentHref(id)} className="mt-4 inline-block underline">
        กลับหน้าคำขอ
      </Link>
      <PaymentForm
        requests={[source]}
        printFontClassName={sarabunPsk.className}
        initial={{
          status: payment.status as "draft" | "returned",
          currentStep: payment.current_step,
          id: payment.id,
          paymentNo: payment.payment_no,
          updatedAt: payment.updated_at,
          idempotencyKey: payment.idempotency_key ?? payment.id,
          details,
          lines,
          checklist: checklist.success ? checklist.data : undefined,
          attachments: payment.payment_attachments,
        }}
      />
    </AppShell>
  );
}
