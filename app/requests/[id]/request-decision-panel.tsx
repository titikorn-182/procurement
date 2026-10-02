"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import {
  AlertTriangle,
  Check,
  Clock3,
  RotateCcw,
  ShieldCheck,
  XCircle,
} from "../../components/icons";
import { transitionProcurementRequest, type TransitionRequestState } from "./actions";

type RequestDecisionPanelProps = {
  requestId: string;
  canAct: boolean;
  taskName: string | null;
  requiredRole: string | null;
  dueAt: string | null;
};

const roleLabels: Record<string, string> = {
  procurement_staff: "เจ้าหน้าที่พัสดุ",
  finance_staff: "เจ้าหน้าที่การเงิน",
  head_procurement: "หัวหน้าเจ้าหน้าที่พัสดุ",
  deputy_secretary: "รองคณบดีหรือหัวหน้าสำนักงาน",
  deputy_finance: "รองคณบดีฝ่ายการเงินและพัสดุ",
  dean: "คณบดี",
  head_office: "หัวหน้าสำนักงานเลขานุการคณะ",
  admin: "ผู้ดูแลระบบ",
};

const initialTransitionRequestState: TransitionRequestState = {
  status: "idle",
  message: "",
};

function DecisionButtons({ comment }: { comment: string }) {
  const { pending } = useFormStatus();
  const needsReasonDisabled = pending || !comment.trim();

  return (
    <div className="grid gap-2">
      <button
        type="submit"
        name="decision"
        value="approve"
        disabled={pending}
        className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--orange-dark)] bg-[var(--orange)] px-4 font-semibold text-white transition-colors hover:bg-[var(--orange-dark)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-wait disabled:opacity-50"
      >
        <Check size={18} aria-hidden="true" />
        {pending ? "กำลังบันทึก..." : "เห็นชอบและส่งต่อ"}
      </button>
      <button
        type="submit"
        name="decision"
        value="return"
        disabled={needsReasonDisabled}
        className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--line-dark)] bg-white px-4 font-semibold text-[var(--ink)] transition-colors hover:bg-[var(--paper-warm)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-45"
      >
        <RotateCcw size={18} aria-hidden="true" />
        ส่งกลับแก้ไข
      </button>
      <button
        type="submit"
        name="decision"
        value="reject"
        disabled={needsReasonDisabled}
        className="inline-flex min-h-11 items-center justify-center gap-2 border border-[var(--red)] bg-white px-4 font-semibold text-[var(--red)] transition-colors hover:bg-[var(--red-soft)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)] disabled:cursor-not-allowed disabled:opacity-45"
      >
        <XCircle size={18} aria-hidden="true" />
        ไม่เห็นชอบ
      </button>
    </div>
  );
}

export function RequestDecisionPanel({
  requestId,
  canAct,
  taskName,
  requiredRole,
  dueAt,
}: RequestDecisionPanelProps) {
  const [state, formAction] = useActionState(
    transitionProcurementRequest,
    initialTransitionRequestState,
  );
  const [comment, setComment] = useState("");
  const formattedDueAt = dueAt
    ? new Intl.DateTimeFormat("th-TH", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Bangkok",
      }).format(new Date(dueAt))
    : "ไม่ระบุกำหนด";

  return (
    <section
      className="border border-[var(--line-dark)] bg-[var(--paper)]"
      aria-labelledby="decision-heading"
    >
      <div className="border-b border-[var(--line-dark)] bg-[var(--graphite)] p-4 text-white">
        <div className="flex items-start gap-3">
          <ShieldCheck className="mt-0.5 shrink-0 text-orange-300" size={21} aria-hidden="true" />
          <div className="min-w-0">
            <h2 id="decision-heading" className="font-bold">
              การพิจารณาขั้นตอนปัจจุบัน
            </h2>
            <p className="mt-1 break-words text-sm text-slate-200">
              {taskName ?? "ไม่มีงานที่รอดำเนินการ"}
            </p>
          </div>
        </div>
      </div>

      <dl className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-2 border-b border-[var(--line)] p-4 text-sm">
        <dt className="text-stone-500">ผู้รับผิดชอบ</dt>
        <dd className="max-w-44 text-right font-semibold">
          {requiredRole ? (roleLabels[requiredRole] ?? requiredRole) : "—"}
        </dd>
        <dt className="flex items-center gap-1.5 text-stone-500">
          <Clock3 size={15} aria-hidden="true" /> กำหนดดำเนินการ
        </dt>
        <dd className="text-right font-semibold tabular-nums">{formattedDueAt}</dd>
      </dl>

      {state.message && (
        <div
          role={state.status === "error" ? "alert" : "status"}
          className={`m-4 flex items-start gap-2 border p-3 text-sm font-semibold ${
            state.status === "error"
              ? "border-red-300 bg-[var(--red-soft)] text-[var(--red)]"
              : "border-green-300 bg-[var(--green-soft)] text-[var(--green)]"
          }`}
        >
          {state.status === "error" ? (
            <AlertTriangle className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
          ) : (
            <Check className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
          )}
          <span>{state.message}</span>
        </div>
      )}

      {canAct ? (
        <form action={formAction} className="p-4">
          <input type="hidden" name="requestId" value={requestId} />
          <label htmlFor="decision-comment" className="font-semibold">
            ความคิดเห็นประกอบการพิจารณา
          </label>
          <p id="decision-comment-hint" className="mt-1 text-xs leading-5 text-stone-500">
            ระบุเหตุผลทุกครั้งเมื่อส่งกลับหรือไม่เห็นชอบ ส่วนการเห็นชอบสามารถเว้นว่างได้
          </p>
          <textarea
            id="decision-comment"
            name="comment"
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            maxLength={2000}
            aria-describedby="decision-comment-hint decision-comment-count"
            className="mt-3 min-h-28 w-full resize-y border border-[var(--line-dark)] bg-white p-3 text-base text-[var(--ink)] placeholder:text-stone-500 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus)]"
            placeholder="บันทึกข้อสังเกตหรือเหตุผลที่ต้องแก้ไข"
          />
          <div id="decision-comment-count" className="mb-4 mt-1 text-right text-xs text-stone-500">
            {comment.length.toLocaleString("th-TH")} / 2,000
          </div>
          <DecisionButtons comment={comment} />
        </form>
      ) : (
        <div className="p-4 text-sm leading-6 text-stone-600">
          บัญชีนี้ดูรายละเอียดได้ แต่ไม่มีสิทธิ์ดำเนินการในขั้นตอนปัจจุบัน
        </div>
      )}
    </section>
  );
}
