import { matchesAmountThreshold } from "@/lib/rules/amount-threshold";

export interface ClassificationRuleInput {
  id: string;
  name?: string;
  pattern: string;
  field: string;
  matchType: string;
  amountOperator?: string | null;
  amountValue?: string | null;
  classification: string;
  categoryId: string | null;
  priority: number;
}

export interface RuleMatchInput {
  description: string;
  amount: string;
  direction: string;
}

export function applyRules(
  transaction: RuleMatchInput,
  rules: ClassificationRuleInput[]
): { classification: string; categoryId: string | null } {
  const rule = findMatchingRule(transaction, rules);
  if (rule) {
    return {
      classification: rule.classification,
      categoryId: rule.categoryId,
    };
  }

  return { classification: "uncategorized", categoryId: null };
}

export function findMatchingRule(
  transaction: RuleMatchInput,
  rules: ClassificationRuleInput[]
): ClassificationRuleInput | null {
  const sorted = [...rules].sort((a, b) => b.priority - a.priority);

  for (const rule of sorted) {
    if (transactionMatchesRule(transaction, rule)) {
      return rule;
    }
  }

  return null;
}

export function transactionMatchesRule(
  transaction: RuleMatchInput,
  rule: Pick<
    ClassificationRuleInput,
    "pattern" | "field" | "matchType" | "amountOperator" | "amountValue"
  >
): boolean {
  const value =
    rule.field === "description"
      ? transaction.description
      : transaction.amount;

  if (!matchRule(value, rule.pattern, rule.matchType)) {
    return false;
  }

  return matchesAmountThreshold(
    transaction.amount,
    rule.amountOperator,
    rule.amountValue
  );
}

function matchRule(value: string, pattern: string, matchType: string): boolean {
  const normalized = value.toLowerCase();
  const normalizedPattern = pattern.toLowerCase();

  switch (matchType) {
    case "contains":
      return normalized.includes(normalizedPattern);
    case "equals":
      return normalized === normalizedPattern;
    case "regex":
      try {
        return new RegExp(pattern, "i").test(value);
      } catch {
        return false;
      }
    default:
      return false;
  }
}
