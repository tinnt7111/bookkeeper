import { buildDedupeHash, ParsedRow } from "@/lib/import/normalize";

export interface ImportPreviewRow extends ParsedRow {
  rowIndex: number;
  classification: string;
  dedupeHash: string;
  error?: string;
}

export interface ParseCsvResult {
  rows: ImportPreviewRow[];
  skippedCount: number;
  dateFrom: Date | null;
  dateTo: Date | null;
  errors: string[];
  hasCardColumn: boolean;
}
