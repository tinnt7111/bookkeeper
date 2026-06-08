import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import {
  getMonthlyBreakdown,
  getPeriodSummary,
  getClassificationTotals,
} from "@/lib/reports/aggregates";
import { formatDate, formatMoney, formatMonth } from "@/lib/format";
import {
  getCurrentYear,
  getTransactionYears,
  parseYearParam,
  yearBounds,
} from "@/lib/year-filter";
import { YearFilterSelect } from "@/components/year-filter-select";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await requireUser();
  const { year: yearParam } = await searchParams;
  const year = parseYearParam(yearParam, getCurrentYear());
  const { from, to } = yearBounds(year);

  const [summary, monthly, split, recentImports, years] = await Promise.all([
    getPeriodSummary(user.id, from, to),
    getMonthlyBreakdown(user.id, from, to),
    getClassificationTotals(user.id, from, to),
    db.importBatch.findMany({
      where: { userId: user.id },
      orderBy: { importedAt: "desc" },
      take: 3,
    }),
    getTransactionYears(user.id),
  ]);

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Business revenue and expenses for {year}. Payment and personal
            transactions are excluded from those totals.
          </p>
        </div>
        <YearFilterSelect
          years={years}
          selectedYear={year}
          basePath="/"
        />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard tone="revenue" label="Business revenue" value={formatMoney(summary.revenue)} />
        <StatCard tone="expenses" label="Business expenses" value={formatMoney(summary.expenses)} />
        <StatCard tone="net" label="Net business income" value={formatMoney(summary.net)} />
        <StatCard
          tone="count"
          label="Uncategorized"
          value={String(summary.uncategorizedCount)}
          hint="Need review"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Panel title="Monthly business breakdown">
          <table className="data-table">
            <thead>
              <tr>
                <th>Month</th>
                <th>Revenue</th>
                <th>Expenses</th>
                <th>Net</th>
              </tr>
            </thead>
            <tbody>
              {monthly.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-muted">
                    No business transactions yet.
                  </td>
                </tr>
              ) : (
                monthly.map((row) => (
                  <tr key={row.month}>
                    <td className="font-medium">{formatMonth(row.month)}</td>
                    <td className="amount-credit">{formatMoney(row.revenue)}</td>
                    <td className="amount-debit">{formatMoney(row.expenses)}</td>
                    <td className={parseFloat(row.net) >= 0 ? "amount-credit font-medium" : "amount-debit font-medium"}>
                      {formatMoney(row.net)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </Panel>

        <Panel title="Classification split">
          <p className="mb-3 text-xs text-muted">
            Payment transactions are excluded from business and personal totals.
          </p>
          <dl className="space-y-3 text-sm">
            <SplitRow
              tone="business"
              label="Business"
              count={split.business.count}
              credits={split.business.credits.toFixed(2)}
              debits={split.business.debits.toFixed(2)}
            />
            <SplitRow
              tone="personal"
              label="Personal"
              count={split.personal.count}
              credits={split.personal.credits.toFixed(2)}
              debits={split.personal.debits.toFixed(2)}
            />
            <SplitRow
              tone="payment"
              label="Payment"
              count={split.payment.count}
              credits={split.payment.credits.toFixed(2)}
              debits={split.payment.debits.toFixed(2)}
            />
            <SplitRow
              tone="uncategorized"
              label="Uncategorized"
              count={split.uncategorized.count}
              credits={split.uncategorized.credits.toFixed(2)}
              debits={split.uncategorized.debits.toFixed(2)}
            />
          </dl>
        </Panel>
      </section>

      <Panel title="Recent imports">
        {recentImports.length === 0 ? (
          <p className="text-sm text-muted">No imports yet.</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {recentImports.map((batch) => (
              <li
                key={batch.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 py-2"
              >
                <span className="font-medium text-primary">{batch.filename}</span>
                <span className="text-muted">
                  {batch.rowCount} rows
                  {batch.dateFrom && batch.dateTo
                    ? ` · ${formatDate(batch.dateFrom)} – ${formatDate(batch.dateTo)}`
                    : ""}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone: "revenue" | "expenses" | "net" | "count";
}) {
  return (
    <div className={`panel panel-padded stat-card stat-card-${tone}`}>
      <p className="stat-label">{label}</p>
      <p className={`stat-value stat-value-${tone}`}>{value}</p>
      {hint ? <p className="stat-hint">{hint}</p> : null}
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="panel panel-padded">
      <h2 className="section-title">{title}</h2>
      {children}
    </section>
  );
}

function SplitRow({
  tone,
  label,
  count,
  credits,
  debits,
}: {
  tone: "business" | "personal" | "payment" | "uncategorized";
  label: string;
  count: number;
  credits: string;
  debits: string;
}) {
  return (
    <div className={`split-row-${tone} flex items-center justify-between border-b border-white/5 pb-2`}>
      <div>
        <dt className="split-label font-medium">
          <span className={`split-dot split-dot-${tone}`} />
          {label}
        </dt>
        <dd className="text-muted">{count} transactions</dd>
      </div>
      <div className="text-right text-sm">
        <div className="amount-credit">In: {formatMoney(credits)}</div>
        <div className="amount-debit">Out: {formatMoney(debits)}</div>
      </div>
    </div>
  );
}
