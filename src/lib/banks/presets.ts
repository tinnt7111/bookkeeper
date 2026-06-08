import type { BankProfileConfig } from "@/lib/import/normalize";

export type StatementType = "checking" | "credit_card";

export interface BankPreset extends BankProfileConfig {
  key: string;
  bankName: string;
  statementType: StatementType;
  name: string;
  notes: string;
}

export const STATEMENT_TYPE_LABELS: Record<StatementType, string> = {
  checking: "Checking",
  credit_card: "Credit Card",
};

export const BANK_PRESETS: BankPreset[] = [
  {
    key: "chase-checking",
    bankName: "Chase",
    statementType: "checking",
    name: "Chase — Checking",
    dateColumn: "Posting Date",
    amountColumn: "Amount",
    descriptionColumn: "Description",
    dateFormat: "MM/dd/yyyy",
    signRule: "negative_debit",
    skipRows: 0,
    notes:
      "Chase checking activity: Posting Date, Description, Amount (negative = debit).",
  },
  {
    key: "chase-credit-card",
    bankName: "Chase",
    statementType: "credit_card",
    name: "Chase — Credit Card",
    dateColumn: "Transaction Date",
    amountColumn: "Amount",
    descriptionColumn: "Description",
    cardColumn: "Card",
    defaultCardLabel: "chase",
    dateFormat: "MM/dd/yyyy",
    signRule: "negative_debit",
    skipRows: 0,
    notes:
      "Chase credit activity: Transaction Date, Description, Amount (negative = purchase). Optional Card column saved when present.",
  },
  {
    key: "capital-one-checking",
    bankName: "Capital One",
    statementType: "checking",
    name: "Capital One — Checking",
    dateColumn: "Transaction Date",
    amountColumn: "Transaction Amount",
    typeColumn: "Transaction Type",
    descriptionColumn: "Transaction Description",
    dateFormat: "MM/dd/yy",
    signRule: "type_column",
    skipRows: 0,
    notes:
      "Capital One checking download: Transaction Date (MM/DD/YY), Transaction Description, Transaction Amount with Transaction Type (Debit/Credit).",
  },
  {
    key: "capital-one-credit-card",
    bankName: "Capital One",
    statementType: "credit_card",
    name: "Capital One — Credit Card",
    dateColumn: "Transaction Date",
    amountColumn: "",
    debitColumn: "Debit",
    creditColumn: "Credit",
    descriptionColumn: "Description",
    dateFormat: "yyyy-MM-dd",
    signRule: "split_columns",
    skipRows: 0,
    notes:
      "Capital One credit card download: Transaction Date, Description, Debit (purchases), Credit (payments). Dates are YYYY-MM-DD.",
  },
  {
    key: "bank-of-america-checking",
    bankName: "Bank of America",
    statementType: "checking",
    name: "Bank of America — Checking",
    dateColumn: "Date",
    amountColumn: "Amount",
    descriptionColumn: "Description",
    headerColumn: "Date",
    dateFormat: "MM/dd/yyyy",
    signRule: "negative_debit",
    skipRows: 0,
    notes:
      "Bank of America checking download: summary block then Date, Description, Amount (negative = debit).",
  },
  {
    key: "bank-of-america-credit-card",
    bankName: "Bank of America",
    statementType: "credit_card",
    name: "Bank of America — Credit Card",
    dateColumn: "Posted Date",
    amountColumn: "Amount",
    descriptionColumn: "Payee",
    defaultCardLabel: "boa",
    dateFormat: "MM/dd/yyyy",
    signRule: "negative_debit",
    skipRows: 0,
    notes:
      "Bank of America credit card: Posted Date, Payee, Amount (negative = purchase).",
  },
  {
    key: "wise-checking",
    bankName: "Wise",
    statementType: "checking",
    name: "Wise — Transaction History",
    dateColumn: "Finished on",
    amountColumn: "Source amount (after fees)",
    typeColumn: "Direction",
    descriptionColumn: "Target name",
    descriptionColumnIn: "Source name",
    descriptionColumnOut: "Target name",
    descriptionSuffixColumns: ["Category"],
    defaultCardLabel: "wise",
    dateFormat: "yyyy-MM-dd HH:mm:ss",
    signRule: "type_column",
    statusColumn: "Status",
    statusValue: "COMPLETED",
    skipRows: 0,
    notes:
      "Wise transaction history export: Finished on, Direction (IN/OUT), Source amount (after fees). Counterparty from Source/Target name.",
  },
  {
    key: "paypal-balance",
    bankName: "PayPal",
    statementType: "checking",
    name: "PayPal — Balance Activity",
    dateColumn: "Date",
    amountColumn: "Total",
    descriptionColumn: "Name",
    descriptionSuffixColumns: ["Item Title"],
    typeColumn: "Type",
    typeAllowlist: ["General Payment", "Mobile Payment"],
    defaultCardLabel: "paypal",
    dateFormat: "MM/dd/yyyy",
    signRule: "negative_debit",
    statusColumn: "Status",
    statusValue: "Completed",
    skipRows: 0,
    notes:
      "PayPal balance export: only General Payment and Mobile Payment (skips card-funded duplicates). Name, Total, Status Completed.",
  },
];

export const ENABLED_BANK_NAMES = [
  "Capital One",
  "Chase",
  "Bank of America",
  "Wise",
  "PayPal",
] as const;

export function isBankEnabled(bankName: string) {
  return (ENABLED_BANK_NAMES as readonly string[]).includes(bankName);
}

export function enabledBanksLabel() {
  const names = [...ENABLED_BANK_NAMES];
  if (names.length <= 1) return names[0] ?? "";
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function presetForProfileId(profileId: string, userId: string) {
  const prefix = `${userId}-`;
  if (!profileId.startsWith(prefix)) return undefined;
  const key = profileId.slice(prefix.length);
  return BANK_PRESETS.find((preset) => preset.key === key);
}

export function profileIdForUser(userId: string, bankKey: string) {
  return `${userId}-${bankKey}`;
}

export function accountIdForUser(userId: string, bankKey: string) {
  return `${userId}-${bankKey}-account`;
}

export function accountIdFromProfileId(profileId: string) {
  return `${profileId}-account`;
}

export function statementTypeLabel(type: string) {
  return STATEMENT_TYPE_LABELS[type as StatementType] ?? type;
}
