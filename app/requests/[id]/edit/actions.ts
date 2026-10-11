"use server";

import * as handlers from "@/features/requests/server/edit-actions";

export async function updateReturnedRequest(
  ...args: Parameters<typeof handlers.updateReturnedRequest>
) {
  return handlers.updateReturnedRequest(...args);
}

export async function resubmitReturnedRequest(
  ...args: Parameters<typeof handlers.resubmitReturnedRequest>
) {
  return handlers.resubmitReturnedRequest(...args);
}
