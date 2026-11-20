"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import {
  applyRules,
  findMatchingRule,
  transactionMatchesRule,
} from "@/lib/rules/apply-rules";
import { normalizeAmountRuleInput } from "@/lib/rules/amount-threshold";
import {
  isAssignableClassification,
  type AssignableClassification,
} from "@/lib/classifications";

type TransactionPreview = {
  id: string;
  date: string;
  description: string;
  amount: string;
  direction: string;
  classification: string;
  ruleName?: string;
  ruleId?: string;
};

async function getUncategorizedTransactions(userId: string) {
  return db.transaction.findMany({
    where: { userId, classification: "uncategorized" },
    orderBy: { date: "desc" },
    select: {
      id: true,
      date: true,
      description: true,
      amount: true,
      direction: true,
    },
  });
}

function toPreview(
  txn: {
    id: string;
    date: Date;
    description: string;
    amount: string;
    direction: string;
  },
  classification: string,
  rule?: { id: string; name?: string }
): TransactionPreview {
  return {
    id: txn.id,
    date: txn.date.toISOString(),
    description: txn.description,
    amount: txn.amount,
    direction: txn.direction,
    classification,
    ruleName: rule?.name,
    ruleId: rule?.id,
  };
}

export async function createRule(formData: FormData) {
  const user = await requireUser();
  const name = (formData.get("name") as string | null)?.trim();
  const pattern = (formData.get("pattern") as string | null)?.trim();
  const classification = formData.get("classification") as string;
  const amount = normalizeAmountRuleInput({
    amountOperator: formData.get("amountOperator") as string | null,
    amountValue: formData.get("amountValue") as string | null,
  });

  if (!name || !pattern) {
    return { error: "Name and pattern are required." };
  }

  if (!isAssignableClassification(classification)) {
    return { error: "Classification must be business, personal, or payment." };
  }

  if ("error" in amount) {
    return { error: amount.error };
  }

  await db.classificationRule.create({
    data: {
      userId: user.id,
      name,
      pattern,
      field: "description",
      matchType: "contains",
      amountOperator: amount.amountOperator,
      amountValue: amount.amountValue,
      classification,
      priority: 0,
    },
  });

  revalidatePath("/settings");
  return { success: true };
}

export async function updateRule(input: {
  ruleId: string;
  name: string;
  pattern: string;
  classification: AssignableClassification;
  amountOperator?: string | null;
  amountValue?: string | null;
}) {
  const user = await requireUser();
  const name = input.name.trim();
  const pattern = input.pattern.trim();
  const amount = normalizeAmountRuleInput({
    amountOperator: input.amountOperator,
    amountValue: input.amountValue,
  });

  if (!name || !pattern) {
    return { error: "Name and pattern are required." };
  }

  if (!isAssignableClassification(input.classification)) {
    return { error: "Classification must be business, personal, or payment." };
  }

  if ("error" in amount) {
    return { error: amount.error };
  }

  const result = await db.classificationRule.updateMany({
    where: { id: input.ruleId, userId: user.id },
    data: {
      name,
      pattern,
      classification: input.classification,
      amountOperator: amount.amountOperator,
      amountValue: amount.amountValue,
    },
  });

  if (result.count === 0) {
    return { error: "Rule not found." };
  }

  revalidatePath("/settings");
  return { success: true };
}

export async function createRuleFromSearch(input: {
  name: string;
  pattern: string;
  classification: AssignableClassification;
  amountOperator?: string | null;
  amountValue?: string | null;
  applyToFiltered?: boolean;
  year?: string;
  month?: string;
  filter?: string;
  q?: string;
  source?: string;
  card?: string;
}) {
  const user = await requireUser();
  const name = input.name.trim();
  const pattern = input.pattern.trim();
  const amount = normalizeAmountRuleInput({
    amountOperator: input.amountOperator ?? "gt",
    amountValue: input.amountValue ?? "0",
  });

  if (!name || !pattern) {
    return { error: "Name and pattern are required." };
  }

  if ("error" in amount) {
    return { error: amount.error };
  }

  await db.classificationRule.create({
    data: {
      userId: user.id,
      name,
      pattern,
      field: "description",
      matchType: "contains",
      amountOperator: amount.amountOperator,
      amountValue: amount.amountValue,
      classification: input.classification,
      priority: 0,
    },
  });

  let updatedCount = 0;

  if (input.applyToFiltered) {
    const { buildTransactionWhere } = await import(
      "@/lib/transactions/filter-query"
    );
    const { where } = buildTransactionWhere(user.id, input);

    const result = await db.transaction.updateMany({
      where,
      data: { classification: input.classification },
    });
    updatedCount = result.count;
  }

  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/");

  return { success: true, updatedCount };
}

export async function deleteRule(ruleId: string) {
  const user = await requireUser();

  await db.classificationRule.deleteMany({
    where: { id: ruleId, userId: user.id },
  });

  revalidatePath("/settings");
}

export async function previewRulePattern(
  pattern: string,
  classification: AssignableClassification,
  amountOperator?: string | null,
  amountValue?: string | null
) {
  const user = await requireUser();
  const trimmed = pattern.trim();
  const amount = normalizeAmountRuleInput({
    amountOperator: amountOperator ?? "gt",
    amountValue: amountValue ?? "0",
  });

  if (!trimmed) {
    return { error: "Enter a text string to match in descriptions." };
  }

  if ("error" in amount) {
    return { error: amount.error };
  }

  const transactions = await getUncategorizedTransactions(user.id);
  const rule = {
    pattern: trimmed,
    field: "description",
    matchType: "contains",
    amountOperator: amount.amountOperator,
    amountValue: amount.amountValue,
  };

  const matches = transactions
    .filter((txn) => transactionMatchesRule(txn, rule))
    .map((txn) => toPreview(txn, classification));

  return { matches, matchCount: matches.length };
}

export async function previewRule(ruleId: string) {
  const user = await requireUser();

  const rule = await db.classificationRule.findFirst({
    where: { id: ruleId, userId: user.id },
  });

  if (!rule) {
    return { error: "Rule not found." };
  }

  const transactions = await getUncategorizedTransactions(user.id);
  const matches = transactions
    .filter((txn) => transactionMatchesRule(txn, rule))
    .map((txn) => toPreview(txn, rule.classification, rule));

  return { matches, matchCount: matches.length, ruleName: rule.name };
}

export async function applyRule(ruleId: string) {
  const user = await requireUser();

  const rule = await db.classificationRule.findFirst({
    where: { id: ruleId, userId: user.id },
  });

  if (!rule) {
    return { error: "Rule not found." };
  }

  const transactions = await getUncategorizedTransactions(user.id);
  const matchingIds = transactions
    .filter((txn) => transactionMatchesRule(txn, rule))
    .map((txn) => txn.id);

  if (matchingIds.length === 0) {
    return { appliedCount: 0 };
  }

  await db.transaction.updateMany({
    where: {
      id: { in: matchingIds },
      userId: user.id,
    },
    data: {
      classification: rule.classification,
      categoryId: rule.categoryId,
    },
  });

  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/");

  return { appliedCount: matchingIds.length, ruleName: rule.name };
}

export async function previewAllRules() {
  const user = await requireUser();

  const rules = await db.classificationRule.findMany({
    where: { userId: user.id },
  });

  if (rules.length === 0) {
    return { error: "Add at least one rule first." };
  }

  const transactions = await getUncategorizedTransactions(user.id);
  const matches = transactions.flatMap((txn) => {
    const rule = findMatchingRule(txn, rules);
    if (!rule) return [];

    return [toPreview(txn, rule.classification, rule)];
  });

  return { matches, matchCount: matches.length };
}

export async function applyAllRules() {
  const user = await requireUser();

  const rules = await db.classificationRule.findMany({
    where: { userId: user.id },
  });

  if (rules.length === 0) {
    return { error: "Add at least one rule first." };
  }

  const transactions = await getUncategorizedTransactions(user.id);
  const groups = new Map<
    string,
    { classification: string; categoryId: string | null; ids: string[] }
  >();

  for (const txn of transactions) {
    const result = applyRules(txn, rules);
    if (result.classification === "uncategorized") continue;

    const key = `${result.classification}::${result.categoryId ?? ""}`;
    const group = groups.get(key) ?? {
      classification: result.classification,
      categoryId: result.categoryId,
      ids: [],
    };
    group.ids.push(txn.id);
    groups.set(key, group);
  }

  let appliedCount = 0;

  for (const group of groups.values()) {
    await db.transaction.updateMany({
      where: {
        id: { in: group.ids },
        userId: user.id,
      },
      data: {
        classification: group.classification,
        categoryId: group.categoryId,
      },
    });
    appliedCount += group.ids.length;
  }

  revalidatePath("/settings");
  revalidatePath("/transactions");
  revalidatePath("/");

  return { appliedCount };
}
