import Decimal from "decimal.js";

export const AMOUNT_OPERATORS = ["gt", "gte", "lt", "lte", "eq", "any"] as const;

export type AmountOperator = (typeof AMOUNT_OPERATORS)[number];

export function isAmountOperator(value: string): value is AmountOperator {
  return (AMOUNT_OPERATORS as readonly string[]).includes(value);
}

export function parseAmountValue(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return null;

  try {
    const amount = new Decimal(trimmed);
    if (!amount.isFinite() || amount.isNegative()) return null;
    return amount;
  } catch {
    return null;
  }
}

export function amountOperatorLabel(operator: string) {
  switch (operator) {
    case "gt":
      return ">";
    case "gte":
      return "≥";
    case "lt":
      return "<";
    case "lte":
      return "≤";
    case "eq":
      return "=";
    case "any":
      return "any";
    default:
      return operator;
  }
}

export function formatAmountCondition(
  operator: string | null | undefined,
  value: string | null | undefined
) {
  const op = operator && isAmountOperator(operator) ? operator : "gt";
  if (op === "any") return "any amount";

  const amount = parseAmountValue(value) ?? new Decimal(0);
  return `amount ${amountOperatorLabel(op)} $${amount.toFixed(2)}`;
}

export function matchesAmountThreshold(
  amount: string,
  operator: string | null | undefined,
  threshold: string | null | undefined
) {
  const op = operator && isAmountOperator(operator) ? operator : "gt";
  if (op === "any") return true;

  let txnAmount: Decimal;
  try {
    txnAmount = new Decimal(amount);
  } catch {
    return false;
  }

  if (!txnAmount.isFinite()) return false;

  const limit = parseAmountValue(threshold) ?? new Decimal(0);

  switch (op) {
    case "gt":
      return txnAmount.greaterThan(limit);
    case "gte":
      return txnAmount.greaterThanOrEqualTo(limit);
    case "lt":
      return txnAmount.lessThan(limit);
    case "lte":
      return txnAmount.lessThanOrEqualTo(limit);
    case "eq":
      return txnAmount.equals(limit);
    default:
      return false;
  }
}

export function normalizeAmountRuleInput(input: {
  amountOperator?: string | null;
  amountValue?: string | null;
}) {
  const operatorRaw = input.amountOperator?.trim() || "gt";
  const operator = isAmountOperator(operatorRaw) ? operatorRaw : "gt";

  if (operator === "any") {
    return { amountOperator: "any", amountValue: "0" };
  }

  const amount = parseAmountValue(input.amountValue);
  if (!amount) {
    return { error: "Enter a valid amount threshold (0 or greater)." as const };
  }

  return {
    amountOperator: operator,
    amountValue: amount.toFixed(2),
  };
}
