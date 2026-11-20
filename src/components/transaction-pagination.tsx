"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  buildTransactionListHref,
  TRANSACTIONS_PAGE_SIZE_OPTIONS,
  type TransactionListParams,
} from "@/lib/transactions/pagination";

type TransactionPaginationProps = TransactionListParams & {
  page: number;
  totalPages: number;
  from: number;
  to: number;
  totalCount: number;
  pageSize: number;
};

export function TransactionPagination({
  year,
  filter,
  month,
  search,
  source,
  card,
  page,
  totalPages,
  from,
  to,
  totalCount,
  pageSize,
}: TransactionPaginationProps) {
  const router = useRouter();

  if (totalCount === 0) {
    return null;
  }

  const base = { year, filter, month, search, source, card, limit: pageSize };
  const prevPage = page > 1 ? page - 1 : null;
  const nextPage = page < totalPages ? page + 1 : null;

  return (
    <nav
      className="pagination-bar"
      aria-label="Transaction pages"
    >
      {prevPage ? (
        <Link
          href={buildTransactionListHref({ ...base, page: prevPage })}
          className="btn-secondary pagination-btn"
        >
          Previous
        </Link>
      ) : (
        <span className="btn-secondary pagination-btn pagination-btn-disabled">
          Previous
        </span>
      )}

      <span className="pagination-summary">
        {from === to
          ? `${from} of ${totalCount.toLocaleString()}`
          : `${from.toLocaleString()}–${to.toLocaleString()} of ${totalCount.toLocaleString()}`}
        {totalPages > 1 ? ` · page ${page} of ${totalPages}` : null}
      </span>

      <label className="pagination-limit">
        <span className="sr-only">Rows per page</span>
        <select
          className="input input-inline min-w-[5.5rem]"
          value={pageSize}
          onChange={(event) => {
            router.push(
              buildTransactionListHref({
                ...base,
                limit: Number(event.target.value),
                page: 1,
              })
            );
          }}
        >
          {TRANSACTIONS_PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size} / page
            </option>
          ))}
        </select>
      </label>

      {nextPage ? (
        <Link
          href={buildTransactionListHref({ ...base, page: nextPage })}
          className="btn-secondary pagination-btn"
        >
          Next
        </Link>
      ) : (
        <span className="btn-secondary pagination-btn pagination-btn-disabled">
          Next
        </span>
      )}
    </nav>
  );
}
