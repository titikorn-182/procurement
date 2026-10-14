"use server";

import { revalidatePath } from "next/cache";
import { saveW804Draft } from "@/features/w804/server/save";

export async function saveW804DraftAction(input: unknown) {
  const result = await saveW804Draft(input);
  if (result.ok) revalidatePath("/requests/w804/registry");
  return result;
}
