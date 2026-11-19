"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";

function revalidateAfterClear() {
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/import");
  revalidatePath("/reports");
  revalidatePath("/settings");
}

export async function clearTransactionsForCard(input: {
  cardId: string;
  confirmText: string;
}) {
  const user = await requireUser();
  const cardId = input.cardId.trim();
  const confirmText = input.confirmText.trim();

  if (!cardId) {
    return { error: "Select a card." };
  }

  const card = await db.card.findFirst({
    where: { id: cardId, userId: user.id },
  });

  if (!card) {
    return { error: "Card not found." };
  }

  if (confirmText !== card.name) {
    return {
      error: `Type the card name “${card.name}” exactly to confirm.`,
    };
  }

  const [transactions, batches] = await db.$transaction([
    db.transaction.deleteMany({
      where: { userId: user.id, cardId: card.id },
    }),
    db.importBatch.deleteMany({
      where: { userId: user.id, cardId: card.id },
    }),
  ]);

  revalidateAfterClear();

  return {
    deletedTransactions: transactions.count,
    deletedBatches: batches.count,
    cardName: card.name,
  };
}

export async function clearAllTransactions(input: { confirmText: string }) {
  const user = await requireUser();
  const confirmText = input.confirmText.trim().toUpperCase();

  if (confirmText !== "CLEAR ALL") {
    return { error: 'Type “CLEAR ALL” exactly to confirm.' };
  }

  const [transactions, batches] = await db.$transaction([
    db.transaction.deleteMany({
      where: { userId: user.id },
    }),
    db.importBatch.deleteMany({
      where: { userId: user.id },
    }),
  ]);

  revalidateAfterClear();

  return {
    deletedTransactions: transactions.count,
    deletedBatches: batches.count,
  };
}
