import { db } from "@/lib/db";

export function getCurrentYear() {
  return new Date().getUTCFullYear();
}

export function parseYearParam(value: string | undefined, fallback = getCurrentYear()) {
  const year = value ? Number(value) : fallback;
  if (!Number.isFinite(year) || year < 1970 || year > 2100) {
    return fallback;
  }
  return year;
}

export function yearBounds(year: number) {
  return {
    from: new Date(Date.UTC(year, 0, 1)),
    to: new Date(Date.UTC(year, 11, 31, 23, 59, 59)),
  };
}

export function monthBounds(monthKey: string) {
  const [year, monthNum] = monthKey.split("-").map(Number);
  return {
    from: new Date(Date.UTC(year, monthNum - 1, 1)),
    to: new Date(Date.UTC(year, monthNum, 0, 23, 59, 59)),
  };
}

export async function getTransactionYears(userId: string) {
  const transactions = await db.transaction.findMany({
    where: { userId },
    select: { date: true },
    orderBy: { date: "asc" },
  });

  const years = new Set(transactions.map((txn) => txn.date.getUTCFullYear()));
  years.add(getCurrentYear());

  return Array.from(years).sort((a, b) => b - a);
}

export async function getTransactionMonthsForYear(userId: string, year: number) {
  const { from, to } = yearBounds(year);
  const transactions = await db.transaction.findMany({
    where: { userId, date: { gte: from, lte: to } },
    select: { date: true },
    orderBy: { date: "desc" },
  });

  return Array.from(
    new Set(transactions.map((txn) => txn.date.toISOString().slice(0, 7)))
  ).sort();
}
