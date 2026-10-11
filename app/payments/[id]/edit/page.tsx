import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import { PageHeader } from "@/app/components/ui";
import { sarabunPsk } from "@/app/components/print/fonts";
import { getPaymentForEditing } from "@/features/payments/server/form-queries";
import { paymentHref } from "../../payment-model";
import { PaymentForm } from "../../new/payment-form";

export default async function EditPaymentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const result = await getPaymentForEditing(id);
  if (result.kind === "not_found") notFound();
  if (result.kind === "forbidden")
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
  const { source, initial, paymentNo } = result;
  return (
    <AppShell>
      <PageHeader
        title={`แก้ไข ${paymentNo}`}
        description="บันทึกข้อมูลในคำขอเดิม เอกสารแนบเดิมยังอยู่จนกว่าจะเลือกนำออกและบันทึก"
      />
      <Link href={paymentHref(id)} className="mt-4 inline-block underline">
        กลับหน้าคำขอ
      </Link>
      <PaymentForm
        requests={[source]}
        printFontClassName={sarabunPsk.className}
        initial={initial}
      />
    </AppShell>
  );
}
