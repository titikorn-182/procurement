import type { W804Draft } from "@/app/requests/w804/model";

export type W804Identity = { id: string; requestNo: string; revision: number };
export type W804SavedDraft = W804Identity & { data: W804Draft };
export type W804SaveResult = { ok: true; record: W804Identity } | { ok: false; error: string };

export function w804WorkspaceHref(requestNo?: string, document = "purchase") {
  const params = new URLSearchParams({ document });
  if (requestNo) params.set("request", requestNo);
  return `/requests/w804?${params}`;
}

export function w804PdfName(requestNo: string, document: string) {
  return `${requestNo}-${document}.pdf`;
}
