import { CircleAlert, ReceiptText } from "lucide-react";
import { toThaiBahtText } from "./pol02";
import type { SourceRequest } from "./types";

function money(value: number) {
  return value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function PaymentSummary({ request, total }: { request: SourceRequest; total: number }) {
  const remaining = request.approved - request.paid;
  const over = total > remaining;

  return (
    <aside className="h-fit min-w-0 border border-[var(--line-dark)] bg-[var(--paper)] xl:sticky xl:top-20">
      <div className="flex items-center gap-3 border-b border-[var(--line)] p-4">
        <ReceiptText aria-hidden="true" />
        <div>
          <h2 className="text-lg font-bold">สรุปวงเงิน POL02</h2>
          <p className="text-xs text-stone-500">อ้างอิง {request.requestNo}</p>
        </div>
      </div>
      <dl className="divide-y divide-[var(--line)]">
        <div className="flex justify-between gap-3 p-4">
          <dt>วงเงินอนุมัติ</dt>
          <dd className="font-bold tabular-nums">{money(request.approved)}</dd>
        </div>
        <div className="flex justify-between gap-3 p-4">
          <dt>เบิกแล้ว/อยู่ระหว่างดำเนินการ</dt>
          <dd className="font-bold tabular-nums">{money(request.paid)}</dd>
        </div>
        <div className="flex justify-between gap-3 bg-[var(--green-soft)] p-4">
          <dt className="font-semibold">คงเหลือ</dt>
          <dd className="font-bold text-[var(--green)] tabular-nums">{money(remaining)}</dd>
        </div>
        <div
          className={`p-4 ${over ? "bg-[var(--red-soft)] text-[var(--red)]" : "bg-[var(--orange-soft)]"}`}
        >
          <div className="flex justify-between gap-3">
            <dt className="font-semibold">ยอดคำขอนี้</dt>
            <dd className="text-xl font-bold tabular-nums">{money(total)}</dd>
          </div>
          <p className="mt-2 text-xs leading-5">{toThaiBahtText(total)}</p>
        </div>
      </dl>
      {over && (
        <div
          role="alert"
          className="flex gap-2 border-t border-red-300 bg-[var(--red-soft)] p-4 text-sm font-semibold text-[var(--red)]"
        >
          <CircleAlert className="mt-0.5 shrink-0" size={18} aria-hidden="true" />
          ยอดคำขอนี้สูงกว่าวงเงินคงเหลือ
        </div>
      )}
      <div className="border-t border-[var(--line)] p-4 text-xs leading-5 text-stone-500">
        ระบบจะตรวจสิทธิ์ วงเงิน เอกสาร และยอดคงเหลือซ้ำอีกครั้งก่อนส่งเข้าสายอนุมัติ
      </div>
    </aside>
  );
}
