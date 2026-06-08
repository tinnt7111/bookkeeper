import { TransactionFilters } from "@/components/transaction-filters";
import { TransactionsTable } from "@/components/transactions-table";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { buildTransactionWhere } from "@/lib/transactions/filter-query";
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
  }>;
}) {
  const user = await requireUser();
  const { filter = "all", month, year: yearParam, q } = await searchParams;
  const search = q?.trim() ?? "";

  const { where, year } = buildTransactionWhere(user.id, {
    year: yearParam,
    month,
    filter,
    q: search,
  });
  const selectedYear = month ? Number(month.split("-")[0]) : year;

  const [transactions, years, months] = await Promise.all([
    db.transaction.findMany({
      where,
      orderBy: { date: "desc" },
      take: search ? 500 : 300,
    }),
    getTransactionYears(user.id),
    getTransactionMonthsForYear(user.id, selectedYear),
  ]);

  const showCardColumn = transactions.some((txn) => txn.cardLabel);

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">
            {selectedYear} · {transactions.length} shown
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
        }))}
        showCardColumn={showCardColumn}
        search={search}
        selectedYear={selectedYear}
        filter={filter}
        month={month}
      />
    </div>
  );
}
