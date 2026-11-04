export type IndexSearchParamValue = string | readonly string[] | undefined;
export type IndexSearchParams = Readonly<Record<string, IndexSearchParamValue>>;

export interface PaginatedResult<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly pageSize: number;
  readonly totalItems: number;
  readonly totalPages: number;
  readonly offset: number;
}

export function firstSearchParam(value: IndexSearchParamValue): string {
  if (typeof value === "string") return value.trim();
  return value?.[0]?.trim() ?? "";
}

export function parsePositivePage(value: IndexSearchParamValue): number {
  const parsed = Number.parseInt(firstSearchParam(value), 10);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : 1;
}

export function normalizeIndexQuery(value: IndexSearchParamValue, locale: string): string {
  return firstSearchParam(value).toLocaleLowerCase(locale);
}

export function paginateItems<T>(
  items: readonly T[],
  requestedPage: number,
  pageSize: number,
): PaginatedResult<T> {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), totalPages);
  const offset = (page - 1) * pageSize;
  return {
    items: items.slice(offset, offset + pageSize),
    page,
    pageSize,
    totalItems: items.length,
    totalPages,
    offset,
  };
}

export function pageContainingIndex(index: number, pageSize: number): number {
  return index < 0 ? 1 : Math.floor(index / pageSize) + 1;
}

export function createIndexHref(
  pathname: string,
  searchParams: IndexSearchParams,
  changes: Readonly<Record<string, string | number | null | undefined>>,
): string {
  const params = new URLSearchParams();
  for (const [key, rawValue] of Object.entries(searchParams)) {
    const value = firstSearchParam(rawValue);
    if (value) params.set(key, value);
  }
  for (const [key, value] of Object.entries(changes)) {
    if (value === null || value === undefined || value === "") params.delete(key);
    else params.set(key, String(value));
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
