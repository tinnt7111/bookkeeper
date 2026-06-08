import Decimal from "decimal.js";
import { createHash } from "crypto";

export type Direction = "credit" | "debit";
export type Classification = "business" | "personal" | "payment" | "uncategorized";

export interface BankProfileConfig {
  dateColumn: string;
  amountColumn: string;
  debitColumn?: string | null;
  creditColumn?: string | null;
  typeColumn?: string | null;
  cardColumn?: string | null;
  defaultCardLabel?: string | null;
  descriptionColumn: string;
  dateFormat: string;
  signRule: string;
  skipRows: number;
  /** When set, scan for this first-column value and treat that row as the CSV header. */
  headerColumn?: string | null;
  /** Counterparty column when direction is credit (e.g. Wise Source name on IN). */
  descriptionColumnIn?: string | null;
  /** Counterparty column when direction is debit (e.g. Wise Target name on OUT). */
  descriptionColumnOut?: string | null;
  descriptionSuffixColumns?: string[] | null;
  statusColumn?: string | null;
  statusValue?: string | null;
  /** When set with typeColumn, only rows whose type value is listed are imported. */
  typeAllowlist?: string[] | null;
}

export interface ParsedRow {
  date: Date;
  amount: string;
  direction: Direction;
  description: string;
  rawDescription: string;
  cardLabel: string | null;
}

function cleanDescription(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function parseAmount(value: string): Decimal | null {
  const cleaned = value.replace(/[$,\s]/g, "").trim();
  if (!cleaned || cleaned === "-") return null;
  try {
    return new Decimal(cleaned);
  } catch {
    return null;
  }
}

function resolveDescription(
  row: Record<string, string>,
  profile: BankProfileConfig,
  direction: Direction
): string {
  if (profile.descriptionColumnIn && profile.descriptionColumnOut) {
    const primary =
      direction === "credit"
        ? row[profile.descriptionColumnIn]?.trim()
        : row[profile.descriptionColumnOut]?.trim();
    const parts = [primary];
    for (const column of profile.descriptionSuffixColumns ?? []) {
      const value = row[column]?.trim();
      if (value) parts.push(value);
    }
    return cleanDescription(parts.filter(Boolean).join(" · "));
  }

  return cleanDescription(row[profile.descriptionColumn] ?? "");
}

export function normalizeRow(
  row: Record<string, string>,
  profile: BankProfileConfig
): ParsedRow | { error: string } {
  let direction: Direction;
  let amountDecimal: Decimal | null = null;

  if (profile.debitColumn && profile.creditColumn) {
    const debitRaw = row[profile.debitColumn]?.trim() ?? "";
    const creditRaw = row[profile.creditColumn]?.trim() ?? "";
    const debit = parseAmount(debitRaw);
    const credit = parseAmount(creditRaw);

    if (credit && !credit.isZero()) {
      direction = "credit";
      amountDecimal = credit.abs();
    } else if (debit && !debit.isZero()) {
      direction = "debit";
      amountDecimal = debit.abs();
    } else {
      return { error: "Missing amount" };
    }
  } else if (profile.signRule === "type_column" && profile.typeColumn) {
    const rawAmount = row[profile.amountColumn] ?? "";
    amountDecimal = parseAmount(rawAmount);
    if (!amountDecimal || amountDecimal.isZero()) {
      return { error: "Missing amount" };
    }

    const typeRaw = row[profile.typeColumn]?.trim().toLowerCase() ?? "";
    amountDecimal = amountDecimal.abs();

    if (typeRaw === "debit" || typeRaw === "out") {
      direction = "debit";
    } else if (typeRaw === "credit" || typeRaw === "in") {
      direction = "credit";
    } else {
      return { error: `Unknown transaction type "${typeRaw || "(empty)"}"` };
    }
  } else {
    const rawAmount = row[profile.amountColumn] ?? "";
    amountDecimal = parseAmount(rawAmount);
    if (!amountDecimal || amountDecimal.isZero()) {
      return { error: "Missing amount" };
    }

    if (profile.signRule === "negative_debit") {
      if (amountDecimal.isNegative()) {
        direction = "debit";
        amountDecimal = amountDecimal.abs();
      } else {
        direction = "credit";
      }
    } else if (profile.signRule === "positive_debit") {
      if (amountDecimal.isPositive()) {
        direction = "debit";
      } else {
        direction = "credit";
        amountDecimal = amountDecimal.abs();
      }
    } else {
      direction = "credit";
    }
  }

  const description = resolveDescription(row, profile, direction);
  const rawDescription = description;

  if (!description) {
    return { error: "Missing description" };
  }

  return {
    date: new Date(), // filled by caller after date parse
    amount: amountDecimal.toFixed(2),
    direction,
    description,
    rawDescription,
    cardLabel: null,
  };
}

export function resolveCardLabel(
  row: Record<string, string>,
  headers: string[],
  profile: Pick<BankProfileConfig, "cardColumn" | "defaultCardLabel">
): string | null {
  if (!profile.cardColumn && !profile.defaultCardLabel) {
    return null;
  }

  if (profile.cardColumn && headers.includes(profile.cardColumn)) {
    const value = row[profile.cardColumn]?.trim();
    if (value) return value;
  }

  return profile.defaultCardLabel ?? null;
}

export function buildDedupeHash(input: {
  date: Date;
  amount: string;
  direction: Direction;
  description: string;
  bankAccountId: string;
  cardLabel?: string | null;
}): string {
  const payload = [
    input.date.toISOString().slice(0, 10),
    input.amount,
    input.direction,
    input.description.toLowerCase(),
    input.bankAccountId,
    input.cardLabel ?? "",
  ].join("|");

  return createHash("sha256").update(payload).digest("hex");
}
