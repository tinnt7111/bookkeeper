import { redirect } from "next/navigation";
import { TransactionFilters } from "@/components/transaction-filters";
import { TransactionPagination } from "@/components/transaction-pagination";
import { TransactionsTable } from "@/components/transactions-table";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { buildTransactionWhere } from "@/lib/transactions/filter-query";
import {
  buildTransactionListHref,
  getTransactionPageBounds,
  parsePageParam,
  TRANSACTIONS_PAGE_SIZE,
} from "@/lib/transactions/pagination";
import {
  getTransactionMonthsForYear,
  getTransactionYears,
} from "@/lib/year-filter";

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    filter?: string;
    month?: string;
    year?: string;
    q?: string;
    page?: string;
  }>;
}) {
  const user = await requireUser();
  const {
    filter = "all",
    month,
    year: yearParam,
    q,
    page: pageParam,
  } = await searchParams;
  const search = q?.trim() ?? "";
  const requestedPage = parsePageParam(pageParam);

  const { where, year } = buildTransactionWhere(user.id, {
    year: yearParam,
    month,
    filter,
    q: search,
  });
  const selectedYear = month ? Number(month.split("-")[0]) : year;

  const [totalCount, years, months] = await Promise.all([
    db.transaction.count({ where }),
    getTransactionYears(user.id),
    getTransactionMonthsForYear(user.id, selectedYear),
  ]);

  const { page, totalPages, from, to } = getTransactionPageBounds(
    requestedPage,
    TRANSACTIONS_PAGE_SIZE,
    totalCount
  );

  if (requestedPage !== page && requestedPage > 1) {
    redirect(
      buildTransactionListHref({
        year: selectedYear,
        filter,
        month,
        search,
        page,
      })
    );
  }

  const transactions = await db.transaction.findMany({
    where,
    orderBy: { date: "desc" },
    skip: (page - 1) * TRANSACTIONS_PAGE_SIZE,
    take: TRANSACTIONS_PAGE_SIZE,
    include: {
      bankAccount: { select: { name: true } },
      importBatch: {
        select: {
          bankProfile: { select: { name: true } },
        },
      },
    },
  });

  const showCardColumn = transactions.some((txn) => txn.cardLabel);

  const listParams = {
    year: selectedYear,
    filter,
    month,
    search,
  };

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">
            {selectedYear}
            {totalCount === 0
              ? " · no transactions"
              : from === to
                ? ` · ${from} of ${totalCount.toLocaleString()}`
                : ` · ${from.toLocaleString()}–${to.toLocaleString()} of ${totalCount.toLocaleString()}`}
            {search ? ` · matching “${search}”` : ""}
          </p>
        </div>
      </div>

      <TransactionFilters
        selectedYear={selectedYear}
        years={years}
        months={months}
        selectedMonth={month}
        filter={filter}
        search={search}
      />

      <TransactionsTable
        transactions={transactions.map((txn) => ({
          id: txn.id,
          date: txn.date.toISOString(),
          description: txn.description,
          amount: txn.amount,
          direction: txn.direction,
          classification: txn.classification,
          cardLabel: txn.cardLabel,
          bankProfileName:
            txn.importBatch?.bankProfile.name ?? txn.bankAccount.name,
        }))}
        showCardColumn={showCardColumn}
        search={search}
        selectedYear={selectedYear}
        filter={filter}
        month={month}
        totalCount={totalCount}
      />

      <TransactionPagination
        {...listParams}
        page={page}
        totalPages={totalPages}
        from={from}
        to={to}
        totalCount={totalCount}
      />
    </div>
  );
}
