import { formatDate, formatMonth } from "@/lib/format";
import type { TaxReportData } from "@/lib/reports/tax-report";

function escapeCsvCell(value: string) {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvRow(cells: string[]) {
  return cells.map(escapeCsvCell).join(",");
}

export function buildTaxSummaryCsv(report: TaxReportData) {
  const lines: string[] = [
    csvRow(["Bookkeeper tax summary"]),
    csvRow(["Tax year", String(report.year)]),
    csvRow(["Generated", report.generatedAt.slice(0, 10)]),
    "",
    csvRow(["Metric", "Amount"]),
    csvRow(["Business revenue", report.summary.revenue]),
    csvRow(["Business expenses", report.summary.expenses]),
    csvRow(["Net business income", report.summary.net]),
    csvRow(["Uncategorized (needs review)", String(report.summary.uncategorizedCount)]),
    "",
    csvRow(["Month", "Revenue", "Expenses", "Net"]),
    ...report.monthly.map((row) =>
      csvRow([formatMonth(row.month), row.revenue, row.expenses, row.net])
    ),
    "",
    csvRow(["Classification", "Count", "Credits in", "Debits out"]),
    csvRow([
      "Business",
      String(report.split.business.count),
      report.split.business.credits,
      report.split.business.debits,
    ]),
    csvRow([
      "Personal (excluded)",
      String(report.split.personal.count),
      report.split.personal.credits,
      report.split.personal.debits,
    ]),
    csvRow([
      "Payment (excluded)",
      String(report.split.payment.count),
      report.split.payment.credits,
      report.split.payment.debits,
    ]),
    csvRow([
      "Uncategorized",
      String(report.split.uncategorized.count),
      report.split.uncategorized.credits,
      report.split.uncategorized.debits,
    ]),
  ];

  if (report.warnings.length > 0) {
    lines.push("", csvRow(["Notes"]), ...report.warnings.map((w) => csvRow([w])));
  }

  return lines.join("\n");
}

export function buildBusinessTransactionsCsv(report: TaxReportData) {
  const lines: string[] = [
    csvRow(["Bookkeeper business transactions"]),
    csvRow(["Tax year", String(report.year)]),
    "",
    csvRow(["Date", "Description", "Direction", "Amount", "Source", "Card"]),
    ...report.businessTransactions.map((txn) =>
      csvRow([
        formatDate(txn.date),
        txn.description,
        txn.direction,
        txn.direction === "debit" ? `-${txn.amount}` : txn.amount,
        txn.source,
        txn.cardLabel ?? "",
      ])
    ),
    "",
    csvRow(["Total revenue", report.summary.revenue]),
    csvRow(["Total expenses", report.summary.expenses]),
    csvRow(["Net business income", report.summary.net]),
  ];

  return lines.join("\n");
}

export function downloadCsv(filename: string, contents: string) {
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
