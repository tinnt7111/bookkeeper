import { db } from "@/lib/db";
import { accountIdFromProfileId } from "@/lib/banks/presets";

type ImportRow = {
  date: string;
  amount: string;
  direction: string;
  description: string;
  rawDescription: string;
  classification: string;
  dedupeHash: string;
  isDuplicate?: boolean;
};

export async function resolveAccountForProfile(userId: string, profileId: string) {
  const [bankProfile, bankAccount] = await Promise.all([
    db.bankProfile.findFirst({
      where: { id: profileId, userId },
    }),
    db.bankAccount.findFirst({
      where: { id: accountIdFromProfileId(profileId), userId },
    }),
  ]);

  if (!bankProfile || !bankAccount) return null;
  if (
    bankAccount.bankName !== bankProfile.bankName ||
    bankAccount.statementType !== bankProfile.statementType
  ) {
    return null;
  }

  return { bankProfile, bankAccount };
}

function countByHash(hashes: string[]) {
  const counts = new Map<string, number>();
  for (const hash of hashes) {
    counts.set(hash, (counts.get(hash) ?? 0) + 1);
  }
  return counts;
}

export async function getExistingDedupeHashCounts(
  userId: string,
  hashes: string[]
) {
  const uniqueHashes = [...new Set(hashes)];
  if (uniqueHashes.length === 0) return new Map<string, number>();

  const existing = await db.transaction.findMany({
    where: { userId, dedupeHash: { in: uniqueHashes } },
    select: { dedupeHash: true },
  });

  return countByHash(existing.map((row) => row.dedupeHash));
}

/**
 * Compare incoming row counts vs database counts per dedupe hash.
 * Example: two $6.50 Starbucks on the same day both import when new;
 * re-importing a file skips only rows already accounted for in the DB.
 */
export function classifyRowsAgainstDatabase<T extends { dedupeHash: string }>(
  rows: T[],
  existingCounts: Map<string, number>
) {
  const remainingInDb = new Map(existingCounts);
  const toInsert: T[] = [];
  let duplicateCount = 0;

  const classified = rows.map((row) => {
    const alreadyStored = remainingInDb.get(row.dedupeHash) ?? 0;

    if (alreadyStored > 0) {
      remainingInDb.set(row.dedupeHash, alreadyStored - 1);
      duplicateCount += 1;
      return { ...row, isDuplicate: true };
    }

    toInsert.push(row);
    return { ...row, isDuplicate: false };
  });

  return { classified, toInsert, duplicateCount };
}

export type { ImportRow };
