import Decimal from "decimal.js";
import { redirect } from "next/navigation";
import { TransactionFilters } from "@/components/transaction-filters";
import { TransactionPagination } from "@/components/transaction-pagination";
import { TransactionsTable } from "@/components/transactions-table";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { formatMoney } from "@/lib/format";
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
    source?: string;
  }>;
}) {
  const user = await requireUser();
  const {
    filter = "all",
    month,
    year: yearParam,
    q,
    page: pageParam,
    source: sourceParam,
  } = await searchParams;
  const search = q?.trim() ?? "";
  const source = sourceParam?.trim() ?? "";
  const requestedPage = parsePageParam(pageParam);

  const { where, year } = buildTransactionWhere(user.id, {
    year: yearParam,
    month,
    filter,
    q: search,
    source,
  });
  const { where: uncategorizedWhere } = buildTransactionWhere(user.id, {
    year: yearParam,
    month,
    filter: "uncategorized",
    q: search,
    source,
  });
  const selectedYear = month ? Number(month.split("-")[0]) : year;

  const [totalCount, years, months, sources, uncategorizedRows] =
    await Promise.all([
      db.transaction.count({ where }),
      getTransactionYears(user.id),
      getTransactionMonthsForYear(user.id, selectedYear),
      db.bankProfile.findMany({
        where: { userId: user.id },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      }),
      db.transaction.findMany({
        where: uncategorizedWhere,
        select: { amount: true, direction: true },
      }),
    ]);

  const uncategorizedTotals = uncategorizedRows.reduce(
    (acc, row) => {
      if (row.direction === "debit") {
        acc.debits = acc.debits.plus(row.amount);
        acc.debitCount += 1;
      } else {
        acc.credits = acc.credits.plus(row.amount);
        acc.creditCount += 1;
      }
      return acc;
    },
    {
      debits: new Decimal(0),
      credits: new Decimal(0),
      debitCount: 0,
      creditCount: 0,
    }
  );
  const uncategorizedCount =
    uncategorizedTotals.debitCount + uncategorizedTotals.creditCount;

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
        source,
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
    source: source || undefined,
  };

  const selectedSourceName = source
    ? sources.find((profile) => profile.id === source)?.name
    : undefined;

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
            {selectedSourceName ? ` · ${selectedSourceName}` : ""}
          </p>
        </div>
      </div>

      <TransactionFilters
        selectedYear={selectedYear}
        years={years}
        months={months}
        sources={sources}
        selectedMonth={month}
        selectedSource={source || undefined}
        filter={filter}
        search={search}
      />

      {uncategorizedCount > 0 ? (
        <p className="message-warning text-sm">
          Uncategorized in this view:{" "}
          <span className="amount-debit font-medium">
            −{formatMoney(uncategorizedTotals.debits.toFixed(2))}
          </span>{" "}
          debit ({uncategorizedTotals.debitCount.toLocaleString()}) ·{" "}
          <span className="amount-credit font-medium">
            +{formatMoney(uncategorizedTotals.credits.toFixed(2))}
          </span>{" "}
          credit ({uncategorizedTotals.creditCount.toLocaleString()}) ·{" "}
          {uncategorizedCount.toLocaleString()} total
        </p>
      ) : (
        <p className="text-sm text-muted">
          No uncategorized transactions in this view.
        </p>
      )}

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
        source={source || undefined}
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
