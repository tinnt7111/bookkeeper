import { db } from "@/lib/db";
import { BUSINESS_PL_CLASSIFICATION } from "@/lib/classifications";
import {
  getClassificationTotals,
  getMonthlyBreakdown,
  getPeriodSummary,
  type ClassificationSplit,
  type MonthlyRow,
  type PeriodSummary,
} from "@/lib/reports/aggregates";
import { yearBounds } from "@/lib/year-filter";

export interface SerializedBucketTotals {
  count: number;
  credits: string;
  debits: string;
}

export interface TaxReportBusinessTransaction {
  date: string;
  description: string;
  amount: string;
  direction: "credit" | "debit";
  source: string;
  cardLabel: string | null;
}

export interface TaxReportData {
  year: number;
  generatedAt: string;
  summary: PeriodSummary;
  monthly: MonthlyRow[];
  split: Record<
    "business" | "personal" | "payment" | "uncategorized",
    SerializedBucketTotals
  >;
  businessTransactions: TaxReportBusinessTransaction[];
  warnings: string[];
}

function serializeSplit(split: ClassificationSplit) {
  return {
    business: {
      count: split.business.count,
      credits: split.business.credits.toFixed(2),
      debits: split.business.debits.toFixed(2),
    },
    personal: {
      count: split.personal.count,
      credits: split.personal.credits.toFixed(2),
      debits: split.personal.debits.toFixed(2),
    },
    payment: {
      count: split.payment.count,
      credits: split.payment.credits.toFixed(2),
      debits: split.payment.debits.toFixed(2),
    },
    uncategorized: {
      count: split.uncategorized.count,
      credits: split.uncategorized.credits.toFixed(2),
      debits: split.uncategorized.debits.toFixed(2),
    },
  };
}

function buildWarnings(
  summary: PeriodSummary,
  split: ClassificationSplit,
  year: number
) {
  const warnings: string[] = [];

  if (summary.uncategorizedCount > 0) {
    warnings.push(
      `${summary.uncategorizedCount} uncategorized transaction${summary.uncategorizedCount === 1 ? "" : "s"} in ${year} should be reviewed before filing.`
    );
  }

  if (split.personal.count > 0) {
    warnings.push(
      `${split.personal.count} personal transaction${split.personal.count === 1 ? "" : "s"} are excluded from this business tax summary.`
    );
  }

  if (split.payment.count > 0) {
    warnings.push(
      `${split.payment.count} payment transfer${split.payment.count === 1 ? "" : "s"} are excluded (account funding / credit card payments).`
    );
  }

  if (
    summary.revenue === "0.00" &&
    summary.expenses === "0.00" &&
    split.business.count === 0
  ) {
    warnings.push(`No business-classified transactions found for ${year}.`);
  }

  return warnings;
}

export async function getTaxReportData(
  userId: string,
  year: number
): Promise<TaxReportData> {
  const { from, to } = yearBounds(year);

  const [summary, monthly, split, businessTransactions] = await Promise.all([
    getPeriodSummary(userId, from, to),
    getMonthlyBreakdown(userId, from, to),
    getClassificationTotals(userId, from, to),
    db.transaction.findMany({
      where: {
        userId,
        date: { gte: from, lte: to },
        classification: BUSINESS_PL_CLASSIFICATION,
      },
      orderBy: [{ date: "asc" }, { createdAt: "asc" }],
      include: {
        bankAccount: { select: { name: true } },
        importBatch: {
          select: {
            bankProfile: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  return {
    year,
    generatedAt: new Date().toISOString(),
    summary,
    monthly,
    split: serializeSplit(split),
    businessTransactions: businessTransactions.map((txn) => ({
      date: txn.date.toISOString(),
      description: txn.description,
      amount: txn.amount,
      direction: txn.direction as "credit" | "debit",
      source: txn.importBatch?.bankProfile.name ?? txn.bankAccount.name,
      cardLabel: txn.cardLabel,
    })),
    warnings: buildWarnings(summary, split, year),
  };
}
