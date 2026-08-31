import "server-only";

import { randomUUID } from "node:crypto";

export function toSafeActionError(scope: string, error: unknown, fallback: string) {
  const reference = randomUUID().slice(0, 8).toUpperCase();
  console.error(`[${scope}] ${reference}`, error);
  return `${fallback} (รหัสอ้างอิง ${reference})`;
}
