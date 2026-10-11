"use server";

import * as handlers from "@/features/requests/server/attachment-actions";

export async function removeReturnedW119Attachments(
  ...args: Parameters<typeof handlers.removeReturnedW119Attachments>
) {
  return handlers.removeReturnedW119Attachments(...args);
}
