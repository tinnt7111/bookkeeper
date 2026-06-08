export const TRANSACTIONS_PAGE_SIZE = 50;

export type TransactionListParams = {
  year: number;
  filter: string;
  month?: string;
  search?: string;
  page?: number;
};

export function parsePageParam(value: string | undefined) {
  const page = Number(value);
  if (!Number.isFinite(page) || page < 1) return 1;
  return Math.floor(page);
}

export function buildTransactionListHref(params: TransactionListParams) {
  const urlParams = new URLSearchParams();
  urlParams.set("year", String(params.year));
  urlParams.set("filter", params.filter);
  if (params.month) urlParams.set("month", params.month);
  if (params.search?.trim()) urlParams.set("q", params.search.trim());
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
