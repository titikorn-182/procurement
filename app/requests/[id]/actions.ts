"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toSafeActionError } from "@/lib/server/action-errors";
import { parseTransitionRequestForm, type WorkflowDecision } from "./schemas";

export type TransitionRequestState = {
  status: "idle" | "success" | "error";
  message: string;
};

export const initialTransitionRequestState: TransitionRequestState = {
  status: "idle",
  message: "",
};

const successMessages: Record<WorkflowDecision, string> = {
  approve: "บันทึกการเห็นชอบและส่งคำขอไปยังขั้นตอนถัดไปแล้ว",
  return: "ส่งคำขอกลับให้ผู้ยื่นแก้ไขแล้ว",
  reject: "บันทึกการไม่เห็นชอบและยุติกระบวนการแล้ว",
};

function workflowErrorMessage(error: { message?: string }) {
  const message = error.message ?? "";
  if (message.includes("workflow task permission required")) {
    return "บัญชีนี้ไม่มีสิทธิ์ดำเนินการในขั้นตอนปัจจุบัน หรือมีผู้ดำเนินการไปแล้ว";
  }
  if (message.includes("pending workflow task not found")) {
    return "ไม่พบงานที่รอดำเนินการ อาจมีผู้ดำเนินการรายการนี้ไปแล้ว กรุณาโหลดหน้าใหม่";
  }
  if (message.includes("terminal state")) {
    return "คำขอนี้สิ้นสุดกระบวนการแล้ว ไม่สามารถเปลี่ยนสถานะได้";
  }
  return toSafeActionError(
    "transition-procurement-request",
    error,
    "ไม่สามารถบันทึกผลการพิจารณาได้ กรุณาลองใหม่",
  );
}

export async function transitionProcurementRequest(
  _previousState: TransitionRequestState,
  formData: FormData,
): Promise<TransitionRequestState> {
  const parsed = parseTransitionRequestForm(formData);
  if (!parsed.success) {
    return {
      status: "error",
      message: parsed.error.issues[0]?.message ?? "ข้อมูลการพิจารณาไม่ถูกต้อง",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { status: "error", message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  }

  const { data, error } = await supabase.rpc("transition_procurement_request", {
    target_request_id: parsed.data.requestId,
    decision: parsed.data.decision,
    decision_comment: parsed.data.comment || null,
  });

  if (error) return { status: "error", message: workflowErrorMessage(error) };

  const result = Array.isArray(data) ? data[0] : data;
  const requestNo = result && typeof result === "object" ? String(result.request_no ?? "") : "";

  revalidatePath("/");
  revalidatePath("/requests");
  revalidatePath("/tasks");
  revalidatePath("/process");
  if (requestNo) revalidatePath(`/requests/${requestNo}`);

  return { status: "success", message: successMessages[parsed.data.decision] };
}
