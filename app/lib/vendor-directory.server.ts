import "server-only";

import { readFile } from "node:fs/promises";
import path from "node:path";

export type VendorDirectoryEntry = {
  id: string;
  name: string;
};

const localDirectoryPath = path.join(
  process.cwd(),
  "app",
  "lib",
  "vendor-directory.ts",
);

let localDirectoryPromise: Promise<VendorDirectoryEntry[] | null> | null = null;

export function normalizeVendorSearchTerm(value: string) {
  return value
    .normalize("NFC")
    .toLocaleLowerCase("th-TH")
    .replace(/^บ\./, "บริษัท")
    .replace(/^หจก\.?/, "ห้างหุ้นส่วนจำกัด")
    .replace(/[\s./(),\-–—]+/g, "");
}

async function readLocalDirectory() {
  if (process.env.NODE_ENV === "production") return null;
  if (localDirectoryPromise) return localDirectoryPromise;

  localDirectoryPromise = readFile(localDirectoryPath, "utf8")
    .then((source) => {
      const entries: VendorDirectoryEntry[] = [];

      for (const line of source.split(/\r?\n/)) {
        const candidate = line.trim().replace(/,$/, "");
        if (!candidate.startsWith("{\"id\":")) continue;

        try {
          const value = JSON.parse(candidate) as Partial<VendorDirectoryEntry>;
          if (typeof value.id === "string" && typeof value.name === "string") {
            entries.push({ id: value.id, name: value.name });
          }
        } catch {
          // Ignore malformed private rows and keep the public application usable.
        }
      }

      return entries.length > 0 ? entries : null;
    })
    .catch(() => null);

  return localDirectoryPromise;
}

export async function searchLocalVendors(query: string, limit = 20) {
  const directory = await readLocalDirectory();
  if (!directory) return null;

  const searchTerm = normalizeVendorSearchTerm(query);
  const matches = directory.filter((vendor) =>
    normalizeVendorSearchTerm(vendor.name).includes(searchTerm),
  );

  return {
    vendors: matches.slice(0, limit),
    total: matches.length,
  };
}

export async function findLocalVendorById(id: string) {
  const directory = await readLocalDirectory();
  return directory?.find((vendor) => vendor.id === id) ?? null;
}
