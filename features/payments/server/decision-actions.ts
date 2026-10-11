import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toSafeActionError } from "@/lib/server/action-errors";
import { parseTransitionRequestForm } from "@/features/requests/decision-schema";
import type { TransitionRequestState } from "@/features/requests/server/decision-actions";
import { paymentHref } from "@/features/payments/model";

export async function transitionPayment(
  _state: TransitionRequestState,
  formData: FormData,
): Promise<TransitionRequestState> {
  const parsed = parseTransitionRequestForm(formData);
  if (!parsed.success)
    return { status: "error", message: parsed.error.issues[0]?.message ?? "ข้อมูลไม่ถูกต้อง" };
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: "error", message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่" };
  const { data, error } = await supabase.rpc("transition_payment_request", {
    target_payment_id: parsed.data.requestId,
    decision: parsed.data.decision,
    decision_comment: parsed.data.comment || null,
  });
  if (error)
    return {
      status: "error",
      message: toSafeActionError(
        "transition-payment",
        error,
        "บันทึกไม่สำเร็จ กรุณาโหลดหน้าใหม่เพื่อตรวจสอบสิทธิ์และขั้นตอนล่าสุด",
      ),
    };
  const result = Array.isArray(data) ? data[0] : data;
  for (const path of ["/", "/payments", "/tasks", "/activity"]) revalidatePath(path);
  if (result?.payment_no) revalidatePath(paymentHref(result.payment_no));
  return {
    status: "success",
    message:
      parsed.data.decision === "return"
        ? "ส่งกลับให้ผู้ยื่นแก้ไขแล้ว"
        : parsed.data.decision === "reject"
          ? "บันทึกการไม่เห็นชอบและยุติคำขอแล้ว"
          : "บันทึกการเห็นชอบและส่งต่อขั้นตอนถัดไปแล้ว",
  };
}
