"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { parseCsvText } from "@/lib/import/parse-csv";
import { applyRules } from "@/lib/rules/apply-rules";
import {
  isBankEnabled,
  enabledBanksLabel,
  presetForProfileId,
} from "@/lib/banks/presets";
import { buildImportProfileConfig } from "@/lib/banks/import-profile";
import { applyManagedCardToRows } from "@/lib/import/apply-card";
import {
  classifyRowsAgainstDatabase,
  getExistingDedupeHashCounts,
  resolveAccountForProfile,
} from "@/lib/import/dedupe-import";

export async function previewImport(formData: FormData) {
  const user = await requireUser();
  const file = formData.get("file") as File | null;
  const bankProfileId = formData.get("bankProfileId") as string;
  const cardId = String(formData.get("cardId") ?? "").trim();

  if (!file || !bankProfileId) {
    return { error: "Missing file or bank profile." };
  }

  if (!cardId) {
    return { error: "Select a card before importing." };
  }

  const [resolved, card] = await Promise.all([
    resolveAccountForProfile(user.id, bankProfileId),
    db.card.findFirst({ where: { id: cardId, userId: user.id } }),
  ]);

  if (!resolved) {
    return { error: "Invalid bank profile." };
  }

  if (!card) {
    return { error: "Invalid card." };
  }

  const { bankAccount, bankProfile } = resolved;

  if (!isBankEnabled(bankProfile.bankName)) {
    return {
      error: `This bank is not available yet. ${enabledBanksLabel()} only for now.`,
    };
  }

  const rules = await db.classificationRule.findMany({
    where: { userId: user.id },
  });

  const csvText = await file.text();
  const preset = presetForProfileId(bankProfileId, user.id);
  const parsed = parseCsvText(
    csvText,
    buildImportProfileConfig(bankProfile, preset),
    bankAccount.id
  );

  const rowsWithClassification = applyManagedCardToRows(
    parsed.rows.map((row) => {
      const ruleResult = applyRules(
        {
          description: row.description,
          amount: row.amount,
          direction: row.direction,
        },
        rules
      );

      return {
        ...row,
        classification: ruleResult.classification,
      };
    }),
    bankAccount.id,
    card
  );

  const existingCounts = await getExistingDedupeHashCounts(
    user.id,
    rowsWithClassification.map((row) => row.dedupeHash)
  );

  const { classified: previewRows, duplicateCount } = classifyRowsAgainstDatabase(
    rowsWithClassification,
    existingCounts
  );

  return {
    filename: file.name,
    bankProfileId,
    cardId: card.id,
    cardName: card.name,
    previewRows,
    skippedCount: parsed.skippedCount,
    dateFrom: parsed.dateFrom?.toISOString() ?? null,
    dateTo: parsed.dateTo?.toISOString() ?? null,
    errors: parsed.errors,
    duplicateCount,
    hasCardColumn: true,
  };
}

export async function confirmImport(formData: FormData) {
  const user = await requireUser();
  const payload = formData.get("payload") as string;

  if (!payload) {
    return { error: "Missing import payload." };
  }

  const data = JSON.parse(payload) as {
    filename: string;
    bankProfileId: string;
    cardId: string;
    rows: Array<{
      date: string;
      amount: string;
      direction: string;
      description: string;
      rawDescription: string;
      cardLabel?: string | null;
      classification: string;
      dedupeHash: string;
      isDuplicate?: boolean;
    }>;
    skippedCount: number;
    dateFrom: string | null;
    dateTo: string | null;
  };

  if (!data.cardId) {
    return { error: "Select a card before importing." };
  }

  const [resolved, card] = await Promise.all([
    resolveAccountForProfile(user.id, data.bankProfileId),
    db.card.findFirst({ where: { id: data.cardId, userId: user.id } }),
  ]);

  if (!resolved) {
    return { error: "Invalid bank profile." };
  }

  if (!card) {
    return { error: "Invalid card." };
  }

  const { bankAccount, bankProfile } = resolved;

  if (!isBankEnabled(bankProfile.bankName)) {
    return {
      error: `This bank is not available yet. ${enabledBanksLabel()} only for now.`,
    };
  }

  const rowsWithCard = applyManagedCardToRows(
    data.rows,
    bankAccount.id,
    card
  );

  const existingCounts = await getExistingDedupeHashCounts(
    user.id,
    rowsWithCard.map((row) => row.dedupeHash)
  );

  const { toInsert, duplicateCount } = classifyRowsAgainstDatabase(
    rowsWithCard,
    existingCounts
  );

  if (toInsert.length === 0) {
    return {
      importedCount: 0,
      duplicateCount,
      error: duplicateCount > 0 ? "All rows already imported." : undefined,
    };
  }

  const importBatch = await db.importBatch.create({
    data: {
      userId: user.id,
      bankAccountId: bankAccount.id,
      bankProfileId: bankProfile.id,
      cardId: card.id,
      filename: data.filename,
      rowCount: toInsert.length,
      skippedCount: data.skippedCount,
      dateFrom: data.dateFrom ? new Date(data.dateFrom) : null,
      dateTo: data.dateTo ? new Date(data.dateTo) : null,
    },
  });

  await db.transaction.createMany({
    data: toInsert.map((row) => ({
      userId: user.id,
      bankAccountId: bankAccount.id,
      importBatchId: importBatch.id,
      cardId: card.id,
      date: new Date(row.date),
      amount: row.amount,
      direction: row.direction,
      description: row.description,
      rawDescription: row.rawDescription,
      cardLabel: card.name,
      classification: row.classification,
      dedupeHash: row.dedupeHash,
    })),
  });

  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/import");
  revalidatePath("/reports");

  return {
    importedCount: toInsert.length,
    duplicateCount,
  };
}

export async function createInvite() {
  const user = await requireUser();
  const { nanoid } = await import("nanoid");
  const { addDays } = await import("date-fns");

  await db.invite.create({
    data: {
      token: nanoid(24),
      createdByUserId: user.id,
      expiresAt: addDays(new Date(), 14),
    },
  });

  revalidatePath("/settings");
}
