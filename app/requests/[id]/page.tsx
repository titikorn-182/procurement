import Link from "next/link";
import { notFound } from "next/navigation";
import { PencilLine } from "lucide-react";
import { AppShell } from "../../components/app-shell";
import { ChevronLeft, Download, FileText, Paperclip, Printer } from "../../components/icons";
import { PageHeader } from "../../components/ui";
import {
  canCurrentUserEditReturnedRequest,
  getRequestDecisionContext,
  getRequestDetail,
} from "../../lib/live-data";
import { formatRequestStatus } from "../../lib/request-status";
import { normalizePol01ApprovalDetails } from "../pol01";
import { RequestDecisionPanel } from "./request-decision-panel";

type AdvanceFundingOption =
  "borrow_before_purchase" | "reimburse_after_purchase" | "faculty_direct_pay_credit_vendor";

const advanceFundingLabels: Record<AdvanceFundingOption, string> = {
  borrow_before_purchase: "ต้องการยืมเงินก่อน (ต้องแนบสัญญายืมในเอกสารแนบ)",
  reimburse_after_purchase: "ไม่ต้องการยืมเงิน (จัดซื้อ/จ้างมาก่อนและทำการเบิก)",
  faculty_direct_pay_credit_vendor:
    "ไม่ต้องการยืมเงิน (มอบงานพัสดุจัดซื้อ/จ้าง กรณีร้านค้าให้เครดิตคณะและจ่ายตรงกับร้านค้า)",
};

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function isAdvanceFundingOption(value: unknown): value is AdvanceFundingOption {
  return (
    typeof value === "string" && Object.prototype.hasOwnProperty.call(advanceFundingLabels, value)
  );
}

function displayText(value: unknown) {
  return typeof value === "string" && value.trim() ? value : "—";
}

export default async function RequestDetailPage({ params }: PageProps<"/requests/[id]">) {
  const { id } = await params;
  const { data, error } = await getRequestDetail(id);
  if (!data && !error) notFound();
  if (!data)
    return (
      <AppShell>
        <PageHeader title="ไม่สามารถเปิดคำขอได้" description="ฐานข้อมูลยังไม่พร้อมใช้งาน" />
        <div
          role="alert"
          className="mt-5 border border-red-300 bg-[var(--red-soft)] p-4 text-[var(--red)]"
        >
          {error}
        </div>
      </AppShell>
    );
  const department = data.departments as { name_th?: string } | null;
  const requester = data.profiles as { full_name?: string; position_title?: string } | null;
  const items = (data.request_items ?? []) as Array<Record<string, unknown>>;
  const attachments = (data.request_attachments ?? []) as Array<Record<string, unknown>>;
  const actions = (data.workflow_actions ?? []) as Array<Record<string, unknown>>;
  const decisionContext = await getRequestDecisionContext(
    String(data.id),
    Number(data.current_step),
  );
  const canEditReturnedRequest = await canCurrentUserEditReturnedRequest(
    String(data.requester_id),
    data.status,
  );
  const formData = asObject(data.form_data);
  const advanceFundingOption = isAdvanceFundingOption(formData.advanceFundingOption)
    ? formData.advanceFundingOption
    : null;
  const vendor = asObject(formData.vendor);
  const budgetCodes = asObject(formData.budgetCodes);
  const approvalDetails = normalizePol01ApprovalDetails(formData.approvalDetails);
  return (
    <AppShell>
      <PageHeader
        title={String(data.request_no)}
        description={String(data.title)}
        action={
          <div className="flex flex-wrap gap-2">
            {canEditReturnedRequest && (
              <Link
                href={`/requests/${id}/edit`}
                className="inline-flex min-h-10 items-center justify-center gap-2 bg-[var(--orange)] px-4 font-bold text-white hover:bg-[var(--orange-dark)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
              >
                <PencilLine size={17} aria-hidden="true" />
                แก้ไขและส่งใหม่
              </Link>
            )}
            <Link
              href={`/requests/${id}/print`}
              className="inline-flex min-h-10 items-center justify-center gap-2 border border-[var(--line-dark)] bg-white px-4 font-semibold text-[var(--ink)] hover:bg-[var(--paper-warm)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            >
              <Printer size={17} aria-hidden="true" />
              พิมพ์ / บันทึก PDF
            </Link>
          </div>
        }
      />
      <Link
        href="/requests"
        className="my-4 inline-flex items-center gap-1 font-semibold hover:text-[var(--orange-dark)]"
      >
        <ChevronLeft size={17} />
        กลับไปคำขอของฉัน
      </Link>
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0 border border-[var(--line-dark)] bg-[var(--paper)]">
          <div className="grid gap-5 border-b border-[var(--line)] p-5 sm:grid-cols-[auto_minmax(0,1fr)] 2xl:grid-cols-[auto_minmax(0,1fr)_auto]">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center border border-[var(--line-dark)]">
              <FileText size={30} />
            </div>
            <div className="min-w-0">
              <h1 className="break-words text-xl font-bold">{String(data.title)}</h1>
              <p className="mt-2 text-sm text-stone-600">{String(data.rationale)}</p>
            </div>
            <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2 text-sm sm:col-start-2 2xl:col-start-auto">
              <dt className="text-stone-500">ประเภท</dt>
              <dd className="font-semibold">{data.kind === "hire" ? "ขอจ้าง" : "ขอซื้อ"}</dd>
              <dt className="text-stone-500">สถานะ</dt>
              <dd className="font-semibold">{formatRequestStatus(data.status)}</dd>
              <dt className="text-stone-500">ขั้นตอน</dt>
              <dd className="font-semibold">ขั้นตอนที่ {String(data.current_step)}</dd>
              <dt className="text-stone-500">วงเงิน</dt>
              <dd className="font-bold tabular-nums">
                {Number(data.estimated_amount).toLocaleString("th-TH", {
                  minimumFractionDigits: 2,
                })}
              </dd>
            </dl>
          </div>
          <section className="p-5">
            <h2 className="text-lg font-bold">รายการสินค้า/บริการ</h2>
            {items.length === 0 ? (
              <p className="mt-3 border border-[var(--line)] p-4 text-sm text-stone-600">
                ยังไม่มีรายการ
              </p>
            ) : (
              <div className="scrollbar-thin mt-3 overflow-x-auto">
                <table className="w-full min-w-[640px] border-collapse">
                  <thead className="bg-stone-100">
                    <tr>
                      {["ลำดับ", "รายการ", "จำนวน", "หน่วย", "ราคาต่อหน่วย", "จำนวนเงิน"].map(
                        (heading) => (
                          <th
                            key={heading}
                            className="border border-[var(--line)] p-2 text-left text-xs"
                          >
                            {heading}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {items
                      .sort((a, b) => Number(a.line_no) - Number(b.line_no))
                      .map((item) => (
                        <tr key={String(item.line_no)}>
                          <td className="border border-[var(--line)] p-2 text-center">
                            {String(item.line_no)}
                          </td>
                          <td className="border border-[var(--line)] p-2">
                            {String(item.description)}
                          </td>
                          <td className="border border-[var(--line)] p-2 text-right">
                            {String(item.quantity)}
                          </td>
                          <td className="border border-[var(--line)] p-2">{String(item.unit)}</td>
                          <td className="border border-[var(--line)] p-2 text-right">
                            {Number(item.unit_price).toLocaleString("th-TH", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="border border-[var(--line)] p-2 text-right">
                            {Number(item.total_amount).toLocaleString("th-TH", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
          {advanceFundingOption && (
            <section className="border-t border-[var(--line)] p-5">
              <h2 className="text-lg font-bold">ข้อมูลการเงินและผู้ประกอบการ</h2>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-stone-500">ความต้องการยืมเงิน</dt>
                  <dd className="mt-1 font-semibold leading-6">
                    {advanceFundingLabels[advanceFundingOption]}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">ผู้ประกอบการ/ร้านค้า</dt>
                  <dd className="mt-1 font-semibold">{displayText(vendor.name)}</dd>
                  {vendor.type === "new" && (
                    <span className="mt-2 inline-block bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
                      ผู้ประกอบการรายใหม่ · ต้องตรวจเอกสาร
                    </span>
                  )}
                </div>
                <div>
                  <dt className="text-stone-500">แหล่งเงินทุน</dt>
                  <dd className="mt-1 font-semibold">{displayText(data.fund_source)}</dd>
                </div>
                <div>
                  <dt className="text-stone-500">รหัสแหล่งเงิน</dt>
                  <dd className="mt-1 font-semibold">
                    {displayText(budgetCodes.sourceCode ?? "2")}
                  </dd>
                </div>
                <div>
                  <dt className="text-stone-500">รหัสหน่วยงาน</dt>
                  <dd className="mt-1 font-semibold">{displayText(budgetCodes.departmentCode)}</dd>
                </div>
                <div>
                  <dt className="text-stone-500">รหัสกองทุน</dt>
                  <dd className="mt-1 font-semibold">{displayText(budgetCodes.fundCode)}</dd>
                </div>
                <div>
                  <dt className="text-stone-500">รหัสกิจกรรม</dt>
                  <dd className="mt-1 font-semibold">{displayText(budgetCodes.activityCode)}</dd>
                </div>
              </dl>
            </section>
          )}
          {formData.formType === "standard" && (
            <section className="border-t border-[var(--line)] p-5">
              <h2 className="text-lg font-bold">ผู้ลงนามและคณะกรรมการ/ผู้ตรวจรับพัสดุ</h2>
              <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-stone-500">ผู้ขอซื้อ/จ้าง</dt>
                  <dd className="mt-1 font-semibold">{approvalDetails.requester.name}</dd>
                  <dd className="text-stone-600">{approvalDetails.requester.position}</dd>
                </div>
                <div>
                  <dt className="text-stone-500">ผู้เห็นชอบ</dt>
                  <dd className="mt-1 font-semibold">{approvalDetails.endorser.name}</dd>
                  <dd className="text-stone-600">{approvalDetails.endorser.position}</dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-stone-500">คณะกรรมการ/ผู้ตรวจรับพัสดุ</dt>
                  <dd className="mt-1">
                    <ol className="space-y-1">
                      {approvalDetails.committee.map((member, index) => (
                        <li key={index}>
                          {index + 1}. {displayText(member.name)} · {member.role}
                        </li>
                      ))}
                    </ol>
                  </dd>
                </div>
                <div className="sm:col-span-2">
                  <dt className="text-stone-500">ผู้อนุมัติ</dt>
                  <dd className="mt-1 font-semibold">{approvalDetails.approver.name}</dd>
                  <dd className="text-stone-600">{approvalDetails.approver.position}</dd>
                </div>
              </dl>
            </section>
          )}
          <section className="border-t border-[var(--line)] p-5">
            <h2 className="text-lg font-bold">เอกสารแนบ</h2>
            {attachments.length === 0 ? (
              <p className="mt-3 text-sm text-stone-600">ไม่มีเอกสารแนบ</p>
            ) : (
              <div className="mt-3 divide-y divide-[var(--line)] border border-[var(--line)]">
                {attachments.map((file) => (
                  <div key={String(file.id)} className="flex items-center gap-3 p-3">
                    <Paperclip size={17} />
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {String(file.file_name)}
                    </span>
                    <span className="text-xs text-stone-500">
                      {Math.ceil(Number(file.size_bytes) / 1024)} KB
                    </span>
                    <a
                      href={`/api/request-attachments/${String(file.id)}`}
                      className="inline-flex size-10 items-center justify-center border border-[var(--line-dark)] bg-white hover:bg-[var(--paper-warm)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
                      aria-label={`ดาวน์โหลด ${String(file.file_name)}`}
                    >
                      <Download size={17} aria-hidden="true" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </section>
        </article>
        <aside className="min-w-0 space-y-5">
          <RequestDecisionPanel
            requestId={String(data.id)}
            canAct={decisionContext.canAct}
            taskName={decisionContext.taskName}
            requiredRole={decisionContext.requiredRole}
            dueAt={decisionContext.dueAt}
          />
          <section className="border border-[var(--line-dark)] bg-[var(--paper)]">
            <h2 className="border-b border-[var(--line)] p-4 font-bold">ข้อมูลผู้ยื่น</h2>
            <dl className="space-y-3 p-4 text-sm">
              <div>
                <dt className="text-stone-500">ชื่อ</dt>
                <dd className="font-semibold">{requester?.full_name || "—"}</dd>
              </div>
              <div>
                <dt className="text-stone-500">ตำแหน่ง</dt>
                <dd>{requester?.position_title || "—"}</dd>
              </div>
              <div>
                <dt className="text-stone-500">หน่วยงาน</dt>
                <dd>{department?.name_th || "—"}</dd>
              </div>
              <div>
                <dt className="text-stone-500">ปีงบประมาณ / แหล่งเงิน</dt>
                <dd>
                  {String(data.budget_year)} · {String(data.fund_source)}
                </dd>
              </div>
            </dl>
          </section>
          <section className="border border-[var(--line-dark)] bg-[var(--paper)]">
            <h2 className="border-b border-[var(--line)] p-4 font-bold">ประวัติการดำเนินการ</h2>
            {actions.length === 0 ? (
              <p className="p-4 text-sm text-stone-600">ยังไม่มีประวัติ</p>
            ) : (
              <ol className="divide-y divide-[var(--line)]">
                {actions.map((action) => (
                  <li key={String(action.id)} className="p-4">
                    <div className="font-semibold">{String(action.action)}</div>
                    <div className="mt-1 text-xs text-stone-500">
                      {new Intl.DateTimeFormat("th-TH", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      }).format(new Date(String(action.created_at)))}
                    </div>
                    {action.comment ? (
                      <p className="mt-2 text-sm">{String(action.comment)}</p>
                    ) : null}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </AppShell>
  );
}
