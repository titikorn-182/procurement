"use server";

import * as handlers from "@/features/catalog/server/actions";

export async function getCatalogAccess(...args: Parameters<typeof handlers.getCatalogAccess>) {
  return handlers.getCatalogAccess(...args);
}

export async function searchCatalogManagement(
  ...args: Parameters<typeof handlers.searchCatalogManagement>
) {
  return handlers.searchCatalogManagement(...args);
}

export async function saveCatalogItem(...args: Parameters<typeof handlers.saveCatalogItem>) {
  return handlers.saveCatalogItem(...args);
}

export async function uploadCatalogImage(...args: Parameters<typeof handlers.uploadCatalogImage>) {
  return handlers.uploadCatalogImage(...args);
}
