import { TaxReportActions } from "@/components/tax-report-actions";
import { YearFilterSelect } from "@/components/year-filter-select";
import { requireUser } from "@/lib/auth/require-user";
import { formatDate, formatMoney, formatMonth } from "@/lib/format";
import { getTaxReportData } from "@/lib/reports/tax-report";
import {
  getCurrentYear,
  getTransactionYears,
  parseYearParam,
} from "@/lib/year-filter";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const user = await requireUser();
  const { year: yearParam } = await searchParams;
  const year = parseYearParam(yearParam, getCurrentYear());

  const [report, years] = await Promise.all([
    getTaxReportData(user.id, year),
    getTransactionYears(user.id),
  ]);

  const generatedLabel = formatDate(report.generatedAt);

  return (
    <div className="page-stack report-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">
            Annual business summary for tax preparation · {year} · generated{" "}
            {generatedLabel}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <YearFilterSelect
            years={years}
            selectedYear={year}
            basePath="/reports"
          />
          <TaxReportActions report={report} />
        </div>
      </div>

      {report.warnings.length > 0 ? (
        <section className="message-warning report-section">
          <h2 className="section-title">Review before filing</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
            {report.warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 report-section">
        <StatCard tone="revenue" label="Business revenue" value={formatMoney(report.summary.revenue)} />
        <StatCard tone="expenses" label="Business expenses" value={formatMoney(report.summary.expenses)} />
        <StatCard tone="net" label="Net business income" value={formatMoney(report.summary.net)} />
        <StatCard
          tone="count"
          label="Business transactions"
          value={String(report.businessTransactions.length)}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-2 report-section">
        <Panel title={`${year} monthly breakdown`}>
          <p className="mb-3 text-xs text-muted">
            Business-classified transactions only. Payment and personal
            transfers are excluded.
          </p>
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
              {report.monthly.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-muted">
                    No business transactions in {year}.
                  </td>
                </tr>
              ) : (
                report.monthly.map((row) => (
                  <tr key={row.month}>
                    <td className="font-medium">{formatMonth(row.month)}</td>
                    <td className="amount-credit">{formatMoney(row.revenue)}</td>
                    <td className="amount-debit">{formatMoney(row.expenses)}</td>
                    <td
                      className={
                        parseFloat(row.net) >= 0
                          ? "amount-credit font-medium"
                          : "amount-debit font-medium"
                      }
                    >
                      {formatMoney(row.net)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {report.monthly.length > 0 ? (
              <tfoot>
                <tr className="font-medium">
                  <td>Total</td>
                  <td className="amount-credit">
                    {formatMoney(report.summary.revenue)}
                  </td>
                  <td className="amount-debit">
                    {formatMoney(report.summary.expenses)}
                  </td>
                  <td
                    className={
                      parseFloat(report.summary.net) >= 0
                        ? "amount-credit"
                        : "amount-debit"
                    }
                  >
                    {formatMoney(report.summary.net)}
                  </td>
                </tr>
              </tfoot>
            ) : null}
          </table>
        </Panel>

        <Panel title="Classification overview">
          <p className="mb-3 text-xs text-muted">
            Only business rows feed the tax totals above.
          </p>
          <dl className="space-y-3 text-sm">
            <OverviewRow
              label="Business"
              count={report.split.business.count}
              credits={report.split.business.credits}
              debits={report.split.business.debits}
            />
            <OverviewRow
              label="Personal (excluded)"
              count={report.split.personal.count}
              credits={report.split.personal.credits}
              debits={report.split.personal.debits}
            />
            <OverviewRow
              label="Payment (excluded)"
              count={report.split.payment.count}
              credits={report.split.payment.credits}
              debits={report.split.payment.debits}
            />
            <OverviewRow
              label="Uncategorized"
              count={report.split.uncategorized.count}
              credits={report.split.uncategorized.credits}
              debits={report.split.uncategorized.debits}
            />
          </dl>
        </Panel>
      </section>

      <Panel title={`Business transactions · ${year}`}>
        <p className="mb-3 text-xs text-muted">
          {report.businessTransactions.length.toLocaleString()} transaction
          {report.businessTransactions.length === 1 ? "" : "s"} included in
          this report. Download CSV for your records or accountant.
        </p>
        <div className="table-scroll report-table-scroll">
          <table className="data-table txn-table">
            <thead>
              <tr>
                <th className="col-date">Date</th>
                <th className="col-source">Source</th>
                <th className="col-description">Description</th>
                <th className="col-amount">Amount</th>
              </tr>
            </thead>
            <tbody>
              {report.businessTransactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="empty-cell text-muted">
                    No business transactions in {year}.
                  </td>
                </tr>
              ) : (
                report.businessTransactions.map((txn, index) => (
                  <tr key={`${txn.date}-${txn.description}-${index}`}>
                    <td className="whitespace-nowrap text-secondary">
                      {formatDate(txn.date)}
                    </td>
                    <td className="col-source text-muted">{txn.source}</td>
                    <td className="col-description">{txn.description}</td>
                    <td
                      className={`whitespace-nowrap font-medium ${
                        txn.direction === "debit"
                          ? "amount-debit"
                          : "amount-credit"
                      }`}
                    >
                      {txn.direction === "debit" ? "−" : "+"}
                      {formatMoney(txn.amount)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>

      <p className="text-xs text-muted print-only report-footer-note">
        Bookkeeper · {year} business tax summary · Generated {generatedLabel}
      </p>
    </div>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "revenue" | "expenses" | "net" | "count";
}) {
  return (
    <div className={`panel panel-padded stat-card stat-card-${tone}`}>
      <p className="stat-label">{label}</p>
      <p className={`stat-value stat-value-${tone}`}>{value}</p>
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
    <section className="panel panel-padded report-section">
      <h2 className="section-title">{title}</h2>
      {children}
    </section>
  );
}

function OverviewRow({
  label,
  count,
  credits,
  debits,
}: {
  label: string;
  count: number;
  credits: string;
  debits: string;
}) {
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-2">
      <div>
        <dt className="font-medium text-primary">{label}</dt>
        <dd className="text-muted">{count} transactions</dd>
      </div>
      <div className="text-right text-sm">
        <div className="amount-credit">In: {formatMoney(credits)}</div>
        <div className="amount-debit">Out: {formatMoney(debits)}</div>
      </div>
    </div>
  );
}
