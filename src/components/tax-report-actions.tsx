"use client";

import {
  buildBusinessTransactionsCsv,
  buildTaxSummaryCsv,
  downloadCsv,
} from "@/lib/reports/export-csv";
import type { TaxReportData } from "@/lib/reports/tax-report";

export function TaxReportActions({ report }: { report: TaxReportData }) {
  return (
    <div className="flex flex-wrap gap-2 print-hidden">
      <button
        type="button"
        className="btn-secondary"
        onClick={() =>
          downloadCsv(
            `bookkeeper-tax-summary-${report.year}.csv`,
            buildTaxSummaryCsv(report)
          )
        }
      >
        Download summary CSV
      </button>
      <button
        type="button"
        className="btn-secondary"
        onClick={() =>
          downloadCsv(
            `bookkeeper-business-transactions-${report.year}.csv`,
            buildBusinessTransactionsCsv(report)
          )
        }
      >
        Download business CSV
      </button>
      <button
        type="button"
        className="btn-primary"
        onClick={() => window.print()}
      >
        Print report
      </button>
    </div>
  );
}
