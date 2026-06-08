import Papa from "papaparse";
import { parseTransactionDate } from "@/lib/import/parse-date";
import {
  BankProfileConfig,
  buildDedupeHash,
  normalizeRow,
  resolveCardLabel,
} from "@/lib/import/normalize";
import { ImportPreviewRow, ParseCsvResult } from "@/lib/import/types";

function trimCsvToHeaderRow(csvText: string, headerColumn: string): string {
  const lines = csvText.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const firstCell = line.match(/^("(?:[^"]|"")*"|[^,]*)/)?.[1];
    if (!firstCell) continue;

    const normalized = firstCell.replace(/^"|"$/g, "").replace(/""/g, '"').trim();
    if (normalized === headerColumn) {
      return lines.slice(i).join("\n");
    }
  }

  return csvText;
}

export function parseCsvText(
  csvText: string,
  profile: BankProfileConfig,
  bankAccountId: string
): ParseCsvResult {
  const csvBody = profile.headerColumn
    ? trimCsvToHeaderRow(csvText, profile.headerColumn)
    : csvText;

  const parsed = Papa.parse<Record<string, string>>(csvBody, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });

  const rows: ImportPreviewRow[] = [];
  let skippedCount = 0;
  const errors: string[] = [];
  let dateFrom: Date | null = null;
  let dateTo: Date | null = null;

  const dataRows = parsed.data.slice(profile.skipRows);
  const headers = parsed.meta.fields ?? Object.keys(parsed.data[0] ?? {});
  const hasCardColumn = Boolean(
    profile.cardColumn && headers.includes(profile.cardColumn)
  );

  dataRows.forEach((row, index) => {
    const rowIndex = index + profile.skipRows + 2;

    if (profile.statusColumn && profile.statusValue) {
      const status = row[profile.statusColumn]?.trim() ?? "";
      if (status !== profile.statusValue) {
        skippedCount += 1;
        return;
      }
    }

    const dateRaw = row[profile.dateColumn]?.trim() ?? "";
    const date = parseTransactionDate(dateRaw, profile.dateFormat);
    if (!date) {
      skippedCount += 1;
      errors.push(`Row ${rowIndex}: invalid date "${dateRaw}"`);
      return;
    }

    const normalized = normalizeRow(row, profile);
    if ("error" in normalized) {
      skippedCount += 1;
      errors.push(`Row ${rowIndex}: ${normalized.error}`);
      return;
    }

    if (!dateFrom || date < dateFrom) dateFrom = date;
    if (!dateTo || date > dateTo) dateTo = date;

    const cardLabel = resolveCardLabel(row, headers, profile);

    rows.push({
      date,
      amount: normalized.amount,
      direction: normalized.direction,
      description: normalized.description,
      rawDescription: normalized.rawDescription,
      cardLabel,
      rowIndex,
      classification: "uncategorized",
      dedupeHash: buildDedupeHash({
        date,
        amount: normalized.amount,
        direction: normalized.direction,
        description: normalized.description,
        bankAccountId,
        cardLabel,
      }),
    });
  });

  return { rows, skippedCount, dateFrom, dateTo, errors, hasCardColumn };
}
