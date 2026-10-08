import Link from "next/link";
import { notFound } from "next/navigation";
import { getRequestDetail } from "@/app/lib/live-data";
import { PrintButton } from "./print-button";
import { sarabunPsk } from "@/app/components/print/fonts";
import { Pol01Document } from "./pol01-document";
import { toPol01PrintData } from "./pol01-print-data";
import { W119Document } from "../../w119/w119-document";
import { toW119PrintData, w119PdfFileName } from "../../w119/w119-print-data";

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function pol01FileName(requestNo: unknown) {
  const identifier =
    typeof requestNo === "string"
      ? requestNo.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
      : "document";
  return `${identifier.startsWith("POL01-") ? identifier : `POL01-${identifier || "document"}`}.pdf`;
}

export default async function RequestPrintPage({ params }: PageProps<"/requests/[id]/print">) {
  const { id } = await params;
  const { data, error } = await getRequestDetail(id);
  if (!data && !error) notFound();
  if (!data)
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-xl font-bold">ไม่สามารถสร้างเอกสารได้</h1>
        <p className="mt-2 text-[var(--red)]">{error}</p>
      </main>
    );

  const attachments = (data.request_attachments ?? []) as Array<Record<string, unknown>>;
  const isW119 = asObject(data.form_data).formType === "w119";
  const documentId = "request-print-document";
  return (
    <main className="min-h-screen bg-stone-200 px-4 py-6 text-black print:bg-white print:p-0">
      <div className="print-hidden mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3">
        <Link
          href={`/requests/${id}`}
          className="inline-flex min-h-10 items-center border border-[var(--line-dark)] bg-white px-4 font-semibold hover:bg-[var(--paper-warm)]"
        >
          กลับไปหน้าคำขอ
        </Link>
        <PrintButton
          targetId={documentId}
          fileName={
            isW119 ? w119PdfFileName(String(data.request_no)) : pol01FileName(data.request_no)
          }
          paginated
          isolatePrint={isW119}
          attachments={attachments.map((attachment) => ({
            id: String(attachment.id),
            name: String(attachment.file_name),
            mimeType: String(attachment.mime_type ?? ""),
            sizeBytes: Number(attachment.size_bytes),
          }))}
        />
      </div>
      {isW119 ? (
        <W119Document
          data={toW119PrintData(data)}
          targetId={documentId}
          fontClassName={sarabunPsk.className}
        />
      ) : (
        <Pol01Document
          data={toPol01PrintData(data)}
          targetId={documentId}
          fontClassName={sarabunPsk.className}
        />
      )}
    </main>
  );
}
