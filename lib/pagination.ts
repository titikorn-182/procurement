export const LIST_PAGE_SIZE = 10;
export const MAX_SEARCH_LENGTH = 200;
export type ListSearchParams = Record<string, string | string[] | undefined>;
export type ListFilters = { q: string; status: string; kind: string; page: number };
export type PageResult<Row> = { rows: Row[]; total: number; page: number; error: string | null };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parseListFilters(
  params: ListSearchParams,
  statuses: readonly string[],
): ListFilters {
  const page = first(params.page) ?? "1";
  const status = first(params.status) ?? "all";
  const kind = first(params.kind);
  return {
    q: (first(params.q) ?? "").trim().slice(0, MAX_SEARCH_LENGTH),
    status: statuses.includes(status) ? status : "all",
    kind: kind === "purchase" || kind === "hire" ? kind : "all",
    page:
      /^\d+$/.test(page) && Number.isSafeInteger(Number(page)) && Number(page) > 0
        ? Math.min(Number(page), 100_000_000)
        : 1,
  };
}

/** Escape regex syntax for PostgREST imatch; %, _ and * must stay literal. */
export function literalSearchPattern(query: string) {
  return query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function pageCount(total: number, size = LIST_PAGE_SIZE) {
  return Math.max(1, Math.ceil(total / size));
}

export function listHref(path: string, filters: ListFilters, page = filters.page) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.kind !== "all") params.set("kind", filters.kind);
  if (page > 1) params.set("page", String(page));
  return params.size ? `${path}?${params}` : path;
}
