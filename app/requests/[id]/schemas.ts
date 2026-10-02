import { z } from "zod";

export const workflowDecisionSchema = z.enum(["approve", "return", "reject"]);

export const transitionRequestSchema = z
  .object({
    requestId: z.string().uuid(),
    decision: workflowDecisionSchema,
    comment: z.string().trim().max(2000, "ความคิดเห็นต้องไม่เกิน 2,000 ตัวอักษร"),
  })
  .superRefine((value, context) => {
    if ((value.decision === "return" || value.decision === "reject") && !value.comment) {
      context.addIssue({
        code: "custom",
        path: ["comment"],
        message: "กรุณาระบุเหตุผลก่อนส่งกลับหรือไม่เห็นชอบ",
      });
    }
  });

export type WorkflowDecision = z.infer<typeof workflowDecisionSchema>;

export function parseTransitionRequestForm(formData: FormData) {
  return transitionRequestSchema.safeParse({
    requestId: formData.get("requestId"),
    decision: formData.get("decision"),
    comment: formData.get("comment") ?? "",
  });
}
