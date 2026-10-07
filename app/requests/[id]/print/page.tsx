import Link from "next/link";
import { notFound } from "next/navigation";
import { getRequestDetail } from "@/app/lib/live-data";
import { formatRequestStatus } from "@/app/lib/request-status";
import { PrintButton } from "./print-button";
import { sarabunPsk } from "@/app/components/print/fonts";
import { Pol01Document } from "./pol01-document";
import { toPol01PrintData } from "./pol01-print-data";

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function display(value: unknown) {
  if (typeof value === "string" && value.trim()) return value;
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString("th-TH", { useGrouping: false });
  }
  return "—";
}

function thaiDate(value: unknown) {
  if (typeof value !== "string" || !value) return "—";
  return new Intl.DateTimeFormat("th-TH", { dateStyle: "long" }).format(new Date(value));
}

function amount(value: unknown) {
  return Number(value).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function pdfFileName(requestNo: unknown, isW119: boolean) {
  const identifier =
    typeof requestNo === "string"
      ? requestNo.trim().replace(/[<>:"/\\|?*\u0000-\u001f]/g, "-")
      : "document";
  if (isW119) return `W119-${identifier || "document"}.pdf`;
  return `${identifier.startsWith("POL01-") ? identifier : `POL01-${identifier || "document"}`}.pdf`;
}

const pageClass =
  "print-document min-h-[297mm] bg-white px-[16mm] py-[14mm] shadow-lg print:min-h-0 print:break-after-page print:shadow-none";

export default async function RequestPrintPage({ params }: PageProps<"/requests/[id]/print">) {
  const { id } = await params;
  const { data, error } = await getRequestDetail(id);
  if (!data && !error) notFound();
  if (!data) {
    return (
      <main className="mx-auto max-w-3xl p-8">
        <h1 className="text-xl font-bold">ไม่สามารถสร้างเอกสารได้</h1>
        <p className="mt-2 text-[var(--red)]">{error}</p>
      </main>
    );
  }

  const department = data.departments as { name_th?: string } | null;
  const requester = data.profiles as { full_name?: string; position_title?: string } | null;
  const items = ((data.request_items ?? []) as Array<Record<string, unknown>>).sort(
    (a, b) => Number(a.line_no) - Number(b.line_no),
  );
  const attachments = (data.request_attachments ?? []) as Array<Record<string, unknown>>;
  const formData = asObject(data.form_data);
  const budgetCodes = asObject(formData.budgetCodes);
  const vendor = asObject(formData.vendor);
  const isW119 = formData.formType === "w119";
  const documentId = "request-print-document";

  if (!isW119) {
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
            fileName={pdfFileName(data.request_no, false)}
            paginated
            attachments={attachments.map((attachment) => ({
              id: String(attachment.id),
              name: String(attachment.file_name),
              mimeType: String(attachment.mime_type ?? ""),
              sizeBytes: Number(attachment.size_bytes),
            }))}
          />
        </div>
        <Pol01Document
          data={toPol01PrintData(data)}
          targetId={documentId}
          fontClassName={sarabunPsk.className}
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-stone-200 px-4 py-6 text-black print:bg-white print:p-0">
      <div className="print-hidden mx-auto mb-4 flex max-w-[210mm] items-center justify-between gap-3">
        <Link
          href={`/requests/${id}`}
          className="inline-flex min-h-10 items-center border border-[var(--line-dark)] bg-white px-4 font-semibold hover:bg-[var(--paper-warm)]"
        >
          กลับไปหน้าคำขอ
        </Link>
        <PrintButton targetId={documentId} fileName={pdfFileName(data.request_no, isW119)} />
      </div>

      <article
        id={documentId}
        className="mx-auto max-w-[210mm] space-y-4 print:max-w-none print:space-y-0"
      >
        <section data-pdf-page className={pageClass}>
          <header className="border-b-2 border-black pb-4 text-center">
            <p className="text-sm font-semibold">คณะรัฐศาสตร์ มหาวิทยาลัยอุบลราชธานี</p>
            <h1 className="mt-2 text-xl font-bold">
              {isW119 ? "แบบฟอร์มขอซื้อขอจ้าง ตามหนังสือ ว119" : "คำขอหลักการขอซื้อหรือขอจ้าง"}
            </h1>
            <p className="mt-1 text-sm">เลขที่คำขอ {display(data.request_no)}</p>
          </header>

          <section className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div>
              <span className="font-semibold">ผู้ยื่นคำขอ:</span> {requester?.full_name || "—"}
            </div>
            <div>
              <span className="font-semibold">ตำแหน่ง:</span> {requester?.position_title || "—"}
            </div>
            <div>
              <span className="font-semibold">หน่วยงาน:</span> {department?.name_th || "—"}
            </div>
            <div>
              <span className="font-semibold">วันที่สร้าง:</span> {thaiDate(data.created_at)}
            </div>
            <div>
              <span className="font-semibold">ประเภท:</span>{" "}
              {data.kind === "hire" ? "ขอจ้าง" : "ขอซื้อ"}
            </div>
            <div>
              <span className="font-semibold">วันที่ต้องการใช้:</span>{" "}
              {thaiDate(data.required_date)}
            </div>
          </section>

          {isW119 && (
            <section className="mt-5 border border-black p-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <p>
                  <span className="font-semibold">ที่:</span> {display(formData.documentNo)}
                </p>
                <p>
                  <span className="font-semibold">ลงวันที่:</span> {thaiDate(formData.memoDate)}
                </p>
                <p className="col-span-2">
                  <span className="font-semibold">เรียน:</span> {display(formData.addressee)}
                </p>
              </div>
            </section>
          )}

          <section className="mt-5 text-sm">
            <h2 className="font-bold">เรื่อง</h2>
            <p className="mt-1 leading-7">{display(data.title)}</p>
            <h2 className="mt-3 font-bold">เหตุผลและความจำเป็น</h2>
            <p className="mt-1 whitespace-pre-wrap leading-7">{display(data.rationale)}</p>
          </section>

          <section className="mt-5">
            <h2 className="mb-2 text-sm font-bold">รายการพัสดุหรือบริการ</h2>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr>
                  {["ลำดับ", "รายการ", "จำนวน", "หน่วย", "ราคาต่อหน่วย", "จำนวนเงิน"].map(
                    (heading) => (
                      <th key={heading} className="border border-black p-1.5 text-center font-bold">
                        {heading}
                      </th>
                    ),
                  )}
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={String(item.line_no)}>
                    <td className="border border-black p-1.5 text-center">
                      {String(item.line_no)}
                    </td>
                    <td className="border border-black p-1.5">{String(item.description)}</td>
                    <td className="border border-black p-1.5 text-right">
                      {String(item.quantity)}
                    </td>
                    <td className="border border-black p-1.5">{String(item.unit)}</td>
                    <td className="border border-black p-1.5 text-right">
                      {amount(item.unit_price)}
                    </td>
                    <td className="border border-black p-1.5 text-right">
                      {amount(item.total_amount)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td colSpan={5} className="border border-black p-1.5 text-right font-bold">
                    รวมทั้งสิ้น
                  </td>
                  <td className="border border-black p-1.5 text-right font-bold">
                    {amount(data.estimated_amount)}
                  </td>
                </tr>
              </tbody>
            </table>
          </section>

          <section className="mt-5 grid grid-cols-2 gap-x-8 gap-y-2 border border-black p-3 text-sm">
            <p>
              <span className="font-semibold">ปีงบประมาณ:</span> {display(data.budget_year)}
            </p>
            <p>
              <span className="font-semibold">แหล่งเงิน:</span> {display(data.fund_source)}
            </p>
            <p>
              <span className="font-semibold">แผนงาน:</span> {display(data.plan_name)}
            </p>
            <p>
              <span className="font-semibold">หมวดรายจ่าย:</span> {display(data.expense_category)}
            </p>
            <p>
              <span className="font-semibold">รหัสแหล่งเงิน:</span>{" "}
              {display(budgetCodes.sourceCode ?? (isW119 ? undefined : "2"))}
            </p>
            <p>
              <span className="font-semibold">รหัสหน่วยงาน:</span>{" "}
              {display(budgetCodes.departmentCode)}
            </p>
            <p>
              <span className="font-semibold">รหัสกองทุน:</span> {display(budgetCodes.fundCode)}
            </p>
            <p>
              <span className="font-semibold">รหัสกิจกรรม:</span>{" "}
              {display(budgetCodes.activityCode)}
            </p>
            <p className="col-span-2">
              <span className="font-semibold">ผู้ประกอบการ:</span> {display(vendor.name)}
            </p>
          </section>

          <section className="mt-5 text-sm">
            <h2 className="font-bold">เอกสารแนบ ({attachments.length} ไฟล์)</h2>
            {attachments.length > 0 ? (
              <ol className="mt-2 list-decimal space-y-1 pl-5">
                {attachments.map((attachment) => (
                  <li key={String(attachment.id)}>{display(attachment.file_name)}</li>
                ))}
              </ol>
            ) : (
              <p className="mt-2">ไม่มีเอกสารแนบ</p>
            )}
          </section>

          {isW119 && (
            <footer className="mt-14 grid grid-cols-2 gap-12 text-center text-sm">
              <div>
                <div className="border-b border-dotted border-black pb-8">ลงชื่อ</div>
                <p className="mt-2">ผู้ยื่นคำขอ</p>
              </div>
              <div>
                <div className="border-b border-dotted border-black pb-8">ลงชื่อ</div>
                <p className="mt-2">ผู้ตรวจสอบ/ผู้พิจารณา</p>
              </div>
            </footer>
          )}

          <p className="mt-10 border-t border-black pt-2 text-center text-xs">
            เอกสารนี้สร้างจากระบบสารสนเทศการบริหารงานพัสดุ · สถานะ{" "}
            {formatRequestStatus(data.status)} · โปรดตรวจสอบลายเซ็นและหลักฐานในระบบก่อนใช้อ้างอิง
          </p>
        </section>
      </article>
    </main>
  );
}
