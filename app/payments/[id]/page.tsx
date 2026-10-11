import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/app/components/app-shell";
import { PageHeader } from "@/app/components/ui";
import { RequestDecisionPanel } from "@/app/requests/[id]/request-decision-panel";
import { getPayment, getPaymentAccess } from "../data";
import { dateText, money, paymentHref, paymentStatusLabels, record, text } from "../payment-model";
import { transitionPayment } from "./actions";

export default async function PaymentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data: payment, error } = await getPayment(id);
  if (!payment && !error) notFound();
  if (!payment)
    return (
      <AppShell>
        <PageHeader title="เปิดคำขอเบิกจ่ายไม่สำเร็จ" />
        <p role="alert" className="mt-5 border p-4 text-[var(--red)]">
          {error}
        </p>
        <Link className="mt-4 inline-block underline" href="/payments">
          กลับรายการเบิกจ่าย
        </Link>
      </AppShell>
    );
  const { task, owner, canAct } = await getPaymentAccess(payment),
    form = record(payment.form_data);
  const supported = form.formType === "pol02" && form.formVersion === 1;
  return (
    <AppShell>
      <PageHeader
        title={payment.payment_no}
        description={text(form.subject) || "คำขอเบิกจ่ายจัดซื้อจัดจ้าง"}
        action={
          <div className="flex flex-wrap gap-2">
            {owner && supported && ["draft", "returned"].includes(payment.status) && (
              <Link
                href={`${paymentHref(id)}/edit`}
                className="inline-flex min-h-11 items-center border px-4 font-semibold"
              >
                {payment.status === "draft" ? "ทำฉบับร่างต่อ" : "แก้ไขและส่งใหม่"}
              </Link>
            )}
            {supported && (
              <Link
                href={`${paymentHref(id)}/print`}
                className="inline-flex min-h-11 items-center border border-[var(--orange-dark)] bg-[var(--orange)] px-4 font-semibold text-white"
              >
                พิมพ์ / ดาวน์โหลด PDF
              </Link>
            )}
          </div>
        }
      />
      <Link href="/payments" className="my-5 inline-block min-h-10 py-2 font-semibold underline">
        กลับรายการเบิกจ่าย
      </Link>
      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <section className="border border-[var(--line-dark)] bg-[var(--paper)]">
            <h2 className="border-b border-[var(--line)] p-4 text-lg font-bold">
              ข้อมูลคำขอ · {paymentStatusLabels[payment.status] ?? payment.status}
            </h2>
            <dl className="grid gap-4 p-4 sm:grid-cols-2">
              {[
                ["ผู้ยื่นคำขอ", text(form.requesterName)],
                ["หน่วยงาน", text(form.departmentName)],
                ["ผู้ประกอบการ", text(form.vendorName)],
                ["ใบแจ้งหนี้", payment.invoice_no],
                ["วันที่ใบแจ้งหนี้", dateText(payment.invoice_date)],
                ["วันที่ส่งคำขอ", dateText(payment.submitted_at)],
                ["ยอดขอเบิก", `${money(Number(payment.total_amount))} บาท`],
                ["การส่งมอบ", payment.delivery_detail],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-sm text-stone-600">{label}</dt>
                  <dd className="mt-1 break-words font-semibold">{value || "—"}</dd>
                </div>
              ))}
            </dl>
            {payment.procurement_requests && (
              <p className="border-t border-[var(--line)] p-4 text-sm">
                คำขอหลักการอ้างอิง{" "}
                <Link
                  href={`/requests/${encodeURIComponent(payment.procurement_requests.request_no)}`}
                  className="font-semibold underline"
                >
                  {payment.procurement_requests.request_no}
                </Link>
              </p>
            )}
          </section>
          <section className="border border-[var(--line-dark)] bg-[var(--paper)]">
            <h2 className="border-b border-[var(--line)] p-4 text-lg font-bold">รายการขอเบิก</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[540px] text-left text-sm">
                <thead className="bg-stone-100">
                  <tr>
                    {["รายการ", "จำนวน", "ราคาต่อหน่วย", "รวม (บาท)"].map((h) => (
                      <th key={h} className="p-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[...payment.payment_items]
                    .sort((a, b) => a.line_no - b.line_no)
                    .map((item) => (
                      <tr key={item.line_no} className="border-t border-[var(--line)]">
                        <td className="max-w-sm break-words p-3">{item.description}</td>
                        <td className="p-3 tabular-nums">{item.quantity}</td>
                        <td className="p-3 tabular-nums">{money(Number(item.unit_price))}</td>
                        <td className="p-3 tabular-nums">
                          {money(Number(item.quantity) * Number(item.unit_price))}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            {!payment.payment_items.length && (
              <p className="p-4 text-sm">คำขอเดิมไม่มีข้อมูลแยกรายการ</p>
            )}
            <p className="border-t p-4 text-right font-bold">
              ภาษี {money(Number(payment.vat_amount))} · รวมทั้งสิ้น{" "}
              {money(Number(payment.total_amount))} บาท
            </p>
          </section>
          <section className="border border-[var(--line-dark)] bg-[var(--paper)]">
            <h2 className="border-b p-4 text-lg font-bold">
              เอกสารแนบ ({payment.payment_attachments.length})
            </h2>
            <ul className="divide-y">
              {payment.payment_attachments.map((file) => (
                <li key={file.id} className="p-4">
                  <a
                    href={`/api/payment-attachments/${file.id}`}
                    className="break-all font-semibold underline"
                  >
                    {file.file_name}
                  </a>
                  <span className="ml-2 text-xs text-stone-600">
                    {file.size_bytes === null
                      ? "ไม่ระบุขนาด"
                      : `${Math.ceil(file.size_bytes / 1024)} KB`}
                  </span>
                </li>
              ))}
            </ul>
            {!payment.payment_attachments.length && (
              <p className="p-4 text-sm text-stone-600">ยังไม่มีเอกสารแนบ</p>
            )}
          </section>
          <section className="border border-[var(--line-dark)] bg-[var(--paper)]">
            <h2 className="border-b p-4 text-lg font-bold">ประวัติการดำเนินการ</h2>
            <ol className="divide-y">
              {payment.payment_workflow_actions.map((action) => (
                <li key={action.id} className="p-4">
                  <p className="font-semibold">
                    {(
                      {
                        submit: "ส่งคำขอ",
                        approve: "เห็นชอบ",
                        return: "ส่งกลับแก้ไข",
                        reject: "ไม่เห็นชอบ",
                        budget_control: "คุมยอด",
                        resubmit: "ส่งใหม่",
                        edit: "แก้ไขข้อมูล",
                      } as Record<string, string>
                    )[action.action] ?? action.action}{" "}
                    · {action.profiles?.full_name ?? "ผู้ดำเนินการ"}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap break-words text-sm">{action.comment}</p>
                  <time className="mt-1 block text-xs text-stone-600">
                    {dateText(action.created_at)}
                  </time>
                </li>
              ))}
            </ol>
            {!payment.payment_workflow_actions.length && (
              <p className="p-4 text-sm text-stone-600">ยังไม่มีประวัติการส่งคำขอ</p>
            )}
          </section>
        </div>
        <div>
          <RequestDecisionPanel
            requestId={payment.id}
            canAct={canAct}
            taskName={task?.step_name ?? null}
            requiredRole={task?.required_role ?? null}
            dueAt={task?.due_at ?? null}
            transitionAction={transitionPayment}
          />
        </div>
      </div>
    </AppShell>
  );
}
