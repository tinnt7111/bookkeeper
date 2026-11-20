export const TRANSACTIONS_PAGE_SIZE = 100;

export const TRANSACTIONS_PAGE_SIZE_OPTIONS = [50, 100, 200, 500] as const;

export type TransactionListParams = {
  year: number;
  filter: string;
  month?: string;
  search?: string;
  source?: string;
  card?: string;
  page?: number;
  limit?: number;
};

export function parsePageParam(value: string | undefined) {
  const page = Number(value);
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.floor(page);
}

export function parsePageSizeParam(value: string | undefined) {
  const size = Number(value);
  if (
    TRANSACTIONS_PAGE_SIZE_OPTIONS.includes(
      size as (typeof TRANSACTIONS_PAGE_SIZE_OPTIONS)[number]
    )
  ) {
    return size;
  }
  return TRANSACTIONS_PAGE_SIZE;
}

export function buildTransactionListHref(params: TransactionListParams) {
  const urlParams = new URLSearchParams();
  urlParams.set("year", String(params.year));
  urlParams.set("filter", params.filter);
  if (params.month) urlParams.set("month", params.month);
  if (params.search?.trim()) urlParams.set("q", params.search.trim());
  if (params.source?.trim()) urlParams.set("source", params.source.trim());
  if (params.card?.trim()) urlParams.set("card", params.card.trim());
  if (params.limit && params.limit !== TRANSACTIONS_PAGE_SIZE) {
    urlParams.set("limit", String(params.limit));
  }
  if (params.page && params.page > 1) {
    urlParams.set("page", String(params.page));
  }
  return `/transactions?${urlParams.toString()}`;
}

export function getTransactionPageBounds(
  page: number,
  pageSize: number,
  totalCount: number
) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const from = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, totalCount);

  return { page: safePage, totalPages, from, to, totalCount };
}
