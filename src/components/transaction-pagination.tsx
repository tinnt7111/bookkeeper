import Link from "next/link";
import {
  buildTransactionListHref,
  type TransactionListParams,
} from "@/lib/transactions/pagination";

type TransactionPaginationProps = TransactionListParams & {
  page: number;
  totalPages: number;
  from: number;
  to: number;
  totalCount: number;
};

export function TransactionPagination({
  year,
  filter,
  month,
  search,
  page,
  totalPages,
  from,
  to,
  totalCount,
}: TransactionPaginationProps) {
  if (totalCount === 0) {
    return null;
  }

  const base = { year, filter, month, search };
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
