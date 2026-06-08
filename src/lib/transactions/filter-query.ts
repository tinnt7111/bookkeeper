import {
  getCurrentYear,
  monthBounds,
  parseYearParam,
  yearBounds,
} from "@/lib/year-filter";

export type TransactionFilterParams = {
  year?: string | number;
  month?: string;
  filter?: string;
  q?: string;
};

export function buildTransactionWhere(
  userId: string,
  params: TransactionFilterParams
) {
  const year = parseYearParam(
    params.year !== undefined ? String(params.year) : undefined,
    getCurrentYear()
  );
  const filter = params.filter ?? "all";
  const search = params.q?.trim() ?? "";

  const where: {
    userId: string;
    classification?: string;
    description?: { contains: string };
    date?: { gte: Date; lte: Date };
  } = { userId };

  if (filter !== "all") {
    where.classification = filter;
  }

  if (search) {
    where.description = { contains: search };
  }

  if (params.month) {
    const { from, to } = monthBounds(params.month);
    where.date = { gte: from, lte: to };
  } else {
    const { from, to } = yearBounds(year);
    where.date = { gte: from, lte: to };
  }

  return { where, year, filter, search };
}
