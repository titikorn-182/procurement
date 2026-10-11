"use server";

import * as handlers from "@/features/settings/server/actions";

export async function saveSystemSetting(...args: Parameters<typeof handlers.saveSystemSetting>) {
  return handlers.saveSystemSetting(...args);
}

export async function updateUserSettings(...args: Parameters<typeof handlers.updateUserSettings>) {
  return handlers.updateUserSettings(...args);
}

export async function createDepartment(...args: Parameters<typeof handlers.createDepartment>) {
  return handlers.createDepartment(...args);
}
