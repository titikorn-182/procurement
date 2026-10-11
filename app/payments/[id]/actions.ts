"use server";

import * as handlers from "@/features/payments/server/decision-actions";

export async function transitionPayment(...args: Parameters<typeof handlers.transitionPayment>) {
  return handlers.transitionPayment(...args);
}
