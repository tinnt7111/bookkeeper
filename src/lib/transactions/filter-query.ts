import { accountIdFromProfileId } from "@/lib/banks/presets";
import type { Prisma } from "@/generated/prisma/client";
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
  source?: string;
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
  const source = params.source?.trim() ?? "";

  const conditions: Prisma.TransactionWhereInput[] = [{ userId }];

  if (filter !== "all") {
    conditions.push({ classification: filter });
  }

  if (search) {
    conditions.push({ description: { contains: search } });
  }

  if (params.month) {
    const { from, to } = monthBounds(params.month);
    conditions.push({ date: { gte: from, lte: to } });
  } else {
    const { from, to } = yearBounds(year);
    conditions.push({ date: { gte: from, lte: to } });
  }

  if (source) {
    conditions.push({
      OR: [
        { importBatch: { bankProfileId: source } },
        {
          importBatchId: null,
          bankAccountId: accountIdFromProfileId(source),
        },
      ],
    });
  }

  return {
    where: { AND: conditions },
    year,
    filter,
    search,
    source,
  };
}
