import Decimal from "decimal.js";
import { db } from "@/lib/db";
import {
  BUSINESS_PL_CLASSIFICATION,
  dashboardBucketForClassification,
  type DashboardBucket,
} from "@/lib/classifications";

export interface PeriodSummary {
  revenue: string;
  expenses: string;
  net: string;
  uncategorizedCount: number;
}

export interface MonthlyRow {
  month: string;
  revenue: string;
  expenses: string;
  net: string;
}

export interface DashboardBucketTotals {
  count: number;
  credits: Decimal;
  debits: Decimal;
}

export type ClassificationSplit = Record<
  DashboardBucket,
  DashboardBucketTotals
>;

function sumAmounts(amounts: string[]): string {
  return amounts
    .reduce((acc, value) => acc.plus(value), new Decimal(0))
    .toFixed(2);
}

function emptyClassificationSplit(): ClassificationSplit {
  return {
    business: { count: 0, credits: new Decimal(0), debits: new Decimal(0) },
    personal: { count: 0, credits: new Decimal(0), debits: new Decimal(0) },
    payment: { count: 0, credits: new Decimal(0), debits: new Decimal(0) },
    uncategorized: {
      count: 0,
      credits: new Decimal(0),
      debits: new Decimal(0),
    },
  };
}

function addToBucket(
  bucket: DashboardBucketTotals,
  amount: string,
  direction: string
) {
  bucket.count += 1;
  if (direction === "credit") {
    bucket.credits = bucket.credits.plus(amount);
  } else {
    bucket.debits = bucket.debits.plus(amount);
  }
}

export async function getPeriodSummary(
  userId: string,
  from: Date,
  to: Date
): Promise<PeriodSummary> {
  const dateRange = { gte: from, lte: to };

  const transactions = await db.transaction.findMany({
    where: {
      userId,
      date: dateRange,
      classification: BUSINESS_PL_CLASSIFICATION,
    },
    select: { amount: true, direction: true },
  });

  const uncategorizedCount = await db.transaction.count({
    where: {
      userId,
      date: dateRange,
      classification: "uncategorized",
    },
  });

  const revenue = sumAmounts(
    transactions.filter((t) => t.direction === "credit").map((t) => t.amount)
  );
  const expenses = sumAmounts(
    transactions.filter((t) => t.direction === "debit").map((t) => t.amount)
  );
  const net = new Decimal(revenue).minus(expenses).toFixed(2);

  return { revenue, expenses, net, uncategorizedCount };
}

export async function getMonthlyBreakdown(
  userId: string,
  from: Date,
  to: Date
): Promise<MonthlyRow[]> {
  const transactions = await db.transaction.findMany({
    where: {
      userId,
      date: { gte: from, lte: to },
      classification: BUSINESS_PL_CLASSIFICATION,
    },
    select: { amount: true, direction: true, date: true },
    orderBy: { date: "asc" },
  });

  const byMonth = new Map<string, { revenue: Decimal; expenses: Decimal }>();

  for (const txn of transactions) {
    const month = txn.date.toISOString().slice(0, 7);
    const current = byMonth.get(month) ?? {
      revenue: new Decimal(0),
      expenses: new Decimal(0),
    };

    if (txn.direction === "credit") {
      current.revenue = current.revenue.plus(txn.amount);
    } else {
      current.expenses = current.expenses.plus(txn.amount);
    }

    byMonth.set(month, current);
  }

  return Array.from(byMonth.entries()).map(([month, totals]) => ({
    month,
    revenue: totals.revenue.toFixed(2),
    expenses: totals.expenses.toFixed(2),
    net: totals.revenue.minus(totals.expenses).toFixed(2),
  }));
}

export async function getClassificationTotals(
  userId: string,
  from: Date,
  to: Date
): Promise<ClassificationSplit> {
  const transactions = await db.transaction.findMany({
    where: { userId, date: { gte: from, lte: to } },
    select: { classification: true, amount: true, direction: true },
  });

  const totals = emptyClassificationSplit();

  for (const txn of transactions) {
    const bucketKey = dashboardBucketForClassification(txn.classification);
    addToBucket(totals[bucketKey], txn.amount, txn.direction);
  }

  return totals;
}
