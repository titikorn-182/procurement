"use server";

import * as handlers from "@/features/requests/server/create-actions";
export type {
  VendorSearchItem,
  VendorSearchResult,
  NewRequestInput,
} from "@/features/requests/server/create-actions";

export async function searchVendors(...args: Parameters<typeof handlers.searchVendors>) {
  return handlers.searchVendors(...args);
}

export async function createRequestDraft(...args: Parameters<typeof handlers.createRequestDraft>) {
  return handlers.createRequestDraft(...args);
}

export async function submitRequestDraft(...args: Parameters<typeof handlers.submitRequestDraft>) {
  return handlers.submitRequestDraft(...args);
}
