"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { buildTransactionWhere } from "@/lib/transactions/filter-query";
import type { AssignableClassification, TransactionClassification } from "@/lib/classifications";

type Classification = TransactionClassification;

export async function updateTransactionClassification(
  transactionId: string,
  classification: Classification
) {
  const user = await requireUser();

  await db.transaction.updateMany({
    where: { id: transactionId, userId: user.id },
    data: { classification },
  });

  revalidatePath("/transactions");
  revalidatePath("/");
}

export async function bulkUpdateClassification(
  transactionIds: string[],
  classification: Classification
) {
  const user = await requireUser();

  if (transactionIds.length === 0) {
    return { updatedCount: 0 };
  }

  const result = await db.transaction.updateMany({
    where: {
      id: { in: transactionIds },
      userId: user.id,
    },
    data: { classification },
  });

  revalidatePath("/transactions");
  revalidatePath("/");
  revalidatePath("/settings");

  return { updatedCount: result.count };
}

export async function bulkClassifyFiltered(input: {
  year?: string;
  month?: string;
  filter?: string;
  q?: string;
  classification: AssignableClassification;
}) {
  const user = await requireUser();
  const { where } = buildTransactionWhere(user.id, input);

  const result = await db.transaction.updateMany({
    where,
    data: { classification: input.classification },
  });

  revalidatePath("/transactions");
  revalidatePath("/");
  revalidatePath("/settings");

  return { updatedCount: result.count };
}

export async function countMatchingTransactions(input: {
  year?: string;
  month?: string;
  filter?: string;
  q?: string;
}) {
  const user = await requireUser();
  const { where } = buildTransactionWhere(user.id, input);

  const count = await db.transaction.count({ where });
  return { count };
}
