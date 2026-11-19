import { formatDate } from "@/lib/format";
import {
  getImportYearCoverage,
  type YearCoverage,
} from "@/lib/import/coverage";
import { getCurrentYear } from "@/lib/year-filter";

export type ImportHistoryRow = {
  id: string;
  filename: string;
  bankProfileName: string;
  cardName: string | null;
  rowCount: number;
  skippedCount: number;
  dateFrom: string | null;
  dateTo: string | null;
  importedAt: string;
};

type ImportHistoryProps = {
  imports: ImportHistoryRow[];
  coverageYear?: number;
};

function formatCoverageLabel(coverage: YearCoverage | null, year: number) {
  if (!coverage) {
    return `Date range unknown · ${year} coverage unavailable`;
  }

  if (coverage.percent <= 0) {
    return `No overlap with ${year}`;
  }

  const rounded = Math.round(coverage.percent);
  return `Covers ${rounded}% of ${year} (${coverage.overlapDays} of ${coverage.yearDays} days)`;
}

export function ImportHistory({
  imports,
  coverageYear = getCurrentYear(),
}: ImportHistoryProps) {
  return (
    <section className="panel panel-padded">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="section-title">Import history</h2>
          <p className="mt-1 text-sm text-secondary">
            All CSV imports · bar shows how much of {coverageYear} each file
            spans by transaction date
          </p>
        </div>
        <span className="text-sm text-muted">
          {imports.length} import{imports.length === 1 ? "" : "s"}
        </span>
      </div>

      {imports.length === 0 ? (
        <p className="mt-4 text-sm text-muted">No imports yet.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {imports.map((batch) => {
            const dateFrom = batch.dateFrom ? new Date(batch.dateFrom) : null;
            const dateTo = batch.dateTo ? new Date(batch.dateTo) : null;
            const coverage = getImportYearCoverage(
              dateFrom,
              dateTo,
              coverageYear
            );
            const barWidth = coverage
              ? Math.min(
                  100,
                  Math.max(coverage.percent, coverage.percent > 0 ? 1.5 : 0)
                )
              : 0;

            return (
              <li
                key={batch.id}
                className="import-history-item border-b border-white/5 pb-4 last:border-b-0 last:pb-0"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-primary">
                      {batch.filename}
                    </p>
                    <p className="mt-0.5 text-sm text-secondary">
                      {batch.bankProfileName}
                      {batch.cardName ? ` · ${batch.cardName}` : ""}
                    </p>
                  </div>
                  <div className="text-right text-sm text-muted">
                    <p>{formatDate(batch.importedAt)}</p>
                    <p>
                      {batch.rowCount} imported
                      {batch.skippedCount > 0
                        ? ` · ${batch.skippedCount} skipped`
                        : ""}
                    </p>
                  </div>
                </div>

                <div className="mt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted">
                    <span>
                      {dateFrom && dateTo
                        ? `${formatDate(dateFrom)} – ${formatDate(dateTo)}`
                        : "Date range unavailable"}
                    </span>
                    <span>{formatCoverageLabel(coverage, coverageYear)}</span>
                  </div>

                  <div className="import-coverage-track mt-2">
                    <div
                      className="import-coverage-fill"
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                  <div className="mt-1 flex justify-between text-[0.6875rem] text-muted">
                    <span>Jan 1</span>
                    <span>{coverageYear}</span>
                    <span>Dec 31</span>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
