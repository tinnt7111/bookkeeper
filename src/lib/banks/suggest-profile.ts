import {
  BANK_PRESETS,
  type BankPreset,
  type StatementType,
  isBankEnabled,
} from "@/lib/banks/presets";

export type FilenameProfileSuggestion = {
  presetKey: string;
  name: string;
  confidence: "high" | "medium";
  score: number;
};

function normalizeFilename(filename: string): string {
  return filename
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

const BANK_ALIASES: Record<string, string[]> = {
  Chase: ["chase"],
  "Capital One": ["capital_one", "capitalone"],
  "Bank of America": ["boa", "bof_a", "bank_of_america", "bankofamerica"],
  Wise: ["wise", "transferwise"],
};

const TYPE_ALIASES: Record<StatementType, string[]> = {
  checking: [
    "checking",
    "transaction_history",
    "transactions_download",
    "transactions",
    "activity",
  ],
  credit_card: ["credit", "crd"],
};

function scorePreset(norm: string, preset: BankPreset): number {
  let score = 0;

  const bankAliases = BANK_ALIASES[preset.bankName] ?? [
    preset.bankName.toLowerCase().replace(/\s+/g, "_"),
  ];
  const bankMatch = bankAliases.some((alias) => norm.includes(alias));
  if (bankMatch) score += 10;

  const typeAliases = TYPE_ALIASES[preset.statementType] ?? [];
  const typeMatch = typeAliases.some((alias) => norm.includes(alias));
  if (typeMatch) score += 8;

  if (
    preset.key === "wise-checking" &&
    norm.includes("wise") &&
    norm.includes("transaction")
  ) {
    score += 12;
  }

  if (
    preset.bankName === "Bank of America" &&
    norm.includes("boa") &&
    preset.statementType === "checking" &&
    norm.includes("checking")
  ) {
    score += 8;
  }

  if (
    preset.bankName === "Bank of America" &&
    norm.includes("boa") &&
    preset.statementType === "credit_card" &&
    norm.includes("credit")
  ) {
    score += 8;
  }

  if (
    preset.statementType === "credit_card" &&
    norm.includes("credit") &&
    bankMatch
  ) {
    score += 4;
  }

  if (
    preset.statementType === "checking" &&
    norm.includes("checking") &&
    bankMatch
  ) {
    score += 4;
  }

  return score;
}

export function suggestPresetFromFilename(
  filename: string
): FilenameProfileSuggestion | null {
  const norm = normalizeFilename(filename);
  let best: { preset: BankPreset; score: number } | null = null;

  for (const preset of BANK_PRESETS) {
    if (!isBankEnabled(preset.bankName)) continue;

    const score = scorePreset(norm, preset);
    if (score <= 0) continue;

    if (!best || score > best.score) {
      best = { preset, score };
    }
  }

  if (!best || best.score < 10) return null;

  return {
    presetKey: best.preset.key,
    name: best.preset.name,
    score: best.score,
    confidence: best.score >= 18 ? "high" : "medium",
  };
}

export function suggestProfileIdFromFilename(
  filename: string,
  profiles: Array<{ id: string; presetKey: string; enabled: boolean; name: string }>
): (FilenameProfileSuggestion & { profileId: string }) | null {
  const match = suggestPresetFromFilename(filename);
  if (!match) return null;

  const profile = profiles.find(
    (item) => item.presetKey === match.presetKey && item.enabled
  );
  if (!profile) return null;

  return {
    ...match,
    profileId: profile.id,
    name: profile.name,
  };
}
