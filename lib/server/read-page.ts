import "server-only";
import { pageCount, type PageResult } from "@/lib/pagination";

type QueryResult<Row> = { data: Row[] | null; count: number | null; error: unknown };

/** Read count and rows together. An out-of-range page is retried once at the last page. */
export async function readPage<Row>(
  query: (from: number, to: number) => PromiseLike<QueryResult<Row>>,
  requestedPage: number,
  size: number,
): Promise<PageResult<Row>> {
  let page = requestedPage;
  let result = await query((page - 1) * size, page * size - 1);
  // PostgREST may return 416/PGRST103 for an offset beyond the total.
  const outOfRange =
    result.error &&
    typeof result.error === "object" &&
    "code" in result.error &&
    result.error.code === "PGRST103";
  if (outOfRange) {
    result = await query(0, size - 1);
    if (result.error) throw result.error;
    page = Math.min(page, pageCount(result.count ?? 0, size));
    if (page > 1) result = await query((page - 1) * size, page * size - 1);
  } else if (!result.error && page > pageCount(result.count ?? 0, size)) {
    page = pageCount(result.count ?? 0, size);
    result = await query((page - 1) * size, page * size - 1);
  }
  if (result.error) throw result.error;
  if (result.count === null) throw new Error("Missing exact list count");
  return { rows: result.data ?? [], total: result.count, page, error: null };
}
