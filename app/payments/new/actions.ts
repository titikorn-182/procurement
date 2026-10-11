"use server";

import * as handlers from "@/features/payments/server/actions";

export async function createPaymentDraft(...args: Parameters<typeof handlers.createPaymentDraft>) {
  return handlers.createPaymentDraft(...args);
}

export async function submitPaymentDraft(...args: Parameters<typeof handlers.submitPaymentDraft>) {
  return handlers.submitPaymentDraft(...args);
}
