"use server";

import * as handlers from "@/features/requests/server/decision-actions";
export type { TransitionRequestState } from "@/features/requests/server/decision-actions";

export async function transitionProcurementRequest(
  ...args: Parameters<typeof handlers.transitionProcurementRequest>
) {
  return handlers.transitionProcurementRequest(...args);
}
