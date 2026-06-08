import type { BankPreset } from "@/lib/banks/presets";
import type { BankProfileConfig } from "@/lib/import/normalize";

type StoredBankProfile = {
  dateColumn: string;
  amountColumn: string;
  debitColumn: string | null;
  creditColumn: string | null;
  typeColumn: string | null;
  cardColumn: string | null;
  defaultCardLabel: string | null;
  descriptionColumn: string;
  dateFormat: string;
  signRule: string;
  skipRows: number;
};

export function buildImportProfileConfig(
  bankProfile: StoredBankProfile,
  preset?: BankPreset
): BankProfileConfig {
  return {
    dateColumn: bankProfile.dateColumn,
    amountColumn: bankProfile.amountColumn,
    debitColumn: bankProfile.debitColumn,
    creditColumn: bankProfile.creditColumn,
    typeColumn: bankProfile.typeColumn,
    cardColumn: bankProfile.cardColumn,
    defaultCardLabel: bankProfile.defaultCardLabel,
    descriptionColumn: bankProfile.descriptionColumn,
    dateFormat: bankProfile.dateFormat,
    signRule: bankProfile.signRule,
    skipRows: bankProfile.skipRows,
    headerColumn: preset?.headerColumn ?? null,
    descriptionColumnIn: preset?.descriptionColumnIn ?? null,
    descriptionColumnOut: preset?.descriptionColumnOut ?? null,
    descriptionSuffixColumns: preset?.descriptionSuffixColumns ?? null,
    statusColumn: preset?.statusColumn ?? null,
    statusValue: preset?.statusValue ?? null,
    typeAllowlist: preset?.typeAllowlist ?? null,
  };
}
