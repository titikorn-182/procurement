import Link from "next/link";
import { notFound } from "next/navigation";
import { getPayment } from "../../data";
import { record, paymentHref, savedPaymentPrintData } from "../../payment-model";
import { sarabunPsk } from "@/app/components/print/fonts";
import { PrintButton } from "@/app/requests/[id]/print/print-button";
import { Pol02Document } from "../../new/pol02-document";

export default async function PaymentPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: payment, error } = await getPayment(id);
  if (!payment && !error) notFound();
  if (!payment || record(payment.form_data).formType !== "pol02")
    return (
      <main className="p-6">
        <h1 className="text-xl font-bold">ไม่สามารถเตรียมแบบพิมพ์ได้</h1>
        <p role="alert" className="my-4">
          {error ?? "คำขอเดิมไม่มีข้อมูลแบบฟอร์ม POL-02 ครบถ้วน"}
        </p>
        <Link href={paymentHref(id)} className="underline">
          กลับหน้าคำขอ
        </Link>
      </main>
    );
  const data = savedPaymentPrintData(payment);
  return (
    <main className="min-w-0 bg-stone-200 p-4 sm:p-6">
      <div className="print-hidden mx-auto mb-5 flex max-w-5xl flex-wrap items-center justify-between gap-4">
        <Link
          href={paymentHref(id)}
          className="inline-flex min-h-11 items-center border border-[var(--line)] bg-white px-4 font-semibold"
        >
          กลับหน้าคำขอ
        </Link>
        <PrintButton
          targetId="saved-payment-document"
          fileName={`${payment.payment_no.replace(/[^a-zA-Z0-9_-]/g, "")}.pdf`}
          paginated
          isolatePrint
          attachments={payment.payment_attachments.map((file) => ({
            id: file.id,
            name: file.file_name,
            mimeType: file.mime_type ?? "",
            sizeBytes: file.size_bytes ?? 0,
            scope: "payment" as const,
          }))}
        />
      </div>
      <Pol02Document
        data={data}
        targetId="saved-payment-document"
        fontClassName={sarabunPsk.className}
      />
    </main>
  );
}
