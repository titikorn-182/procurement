"use server";

import * as handlers from "@/features/catalog/server/search-actions";

export async function searchProcurementCatalog(
  ...args: Parameters<typeof handlers.searchProcurementCatalog>
) {
  return handlers.searchProcurementCatalog(...args);
}
