import { db } from "@/lib/db";
import {
  BANK_PRESETS,
  STATEMENT_TYPE_LABELS,
  accountIdForUser,
  profileIdForUser,
} from "@/lib/banks/presets";

export async function ensureBankProfilesForUser(userId: string) {
  for (const preset of BANK_PRESETS) {
    await db.bankProfile.upsert({
      where: { id: profileIdForUser(userId, preset.key) },
      update: {
        name: preset.name,
        bankName: preset.bankName,
        statementType: preset.statementType,
        dateColumn: preset.dateColumn,
        amountColumn: preset.amountColumn,
        debitColumn: preset.debitColumn ?? null,
        creditColumn: preset.creditColumn ?? null,
        typeColumn: preset.typeColumn ?? null,
        cardColumn: preset.cardColumn ?? null,
        defaultCardLabel: preset.defaultCardLabel ?? null,
        descriptionColumn: preset.descriptionColumn,
        dateFormat: preset.dateFormat,
        signRule: preset.signRule,
        skipRows: preset.skipRows,
      },
      create: {
        id: profileIdForUser(userId, preset.key),
        userId,
        name: preset.name,
        bankName: preset.bankName,
        statementType: preset.statementType,
        dateColumn: preset.dateColumn,
        amountColumn: preset.amountColumn,
        debitColumn: preset.debitColumn ?? null,
        creditColumn: preset.creditColumn ?? null,
        typeColumn: preset.typeColumn ?? null,
        cardColumn: preset.cardColumn ?? null,
        defaultCardLabel: preset.defaultCardLabel ?? null,
        descriptionColumn: preset.descriptionColumn,
        dateFormat: preset.dateFormat,
        signRule: preset.signRule,
        skipRows: preset.skipRows,
      },
    });

    const accountLabel = STATEMENT_TYPE_LABELS[preset.statementType];

    await db.bankAccount.upsert({
      where: { id: accountIdForUser(userId, preset.key) },
      update: {
        name: `${preset.bankName} ${accountLabel}`,
        bankName: preset.bankName,
        statementType: preset.statementType,
      },
      create: {
        id: accountIdForUser(userId, preset.key),
        userId,
        name: `${preset.bankName} ${accountLabel}`,
        bankName: preset.bankName,
        statementType: preset.statementType,
        currency: "USD",
      },
    });
  }
}
