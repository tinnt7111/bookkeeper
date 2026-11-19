import { buildDedupeHash } from "@/lib/import/normalize";

type RowWithHash = {
  date: Date | string;
  amount: string;
  direction: string;
  description: string;
  rawDescription: string;
  classification: string;
  cardLabel?: string | null;
  dedupeHash: string;
  isDuplicate?: boolean;
};

export function applyManagedCardToRows<T extends RowWithHash>(
  rows: T[],
  bankAccountId: string,
  card: { id: string; name: string }
) {
  return rows.map((row) => {
    const date = typeof row.date === "string" ? new Date(row.date) : row.date;
    const direction = row.direction as "credit" | "debit";

    return {
      ...row,
      cardId: card.id,
      cardLabel: card.name,
      dedupeHash: buildDedupeHash({
        date,
        amount: row.amount,
        direction,
        description: row.description,
        bankAccountId,
        cardId: card.id,
        cardLabel: card.name,
      }),
    };
  });
}
