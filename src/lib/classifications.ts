export const TRANSACTION_CLASSIFICATIONS = [
  "uncategorized",
  "business",
  "personal",
  "payment",
] as const;

export type TransactionClassification =
  (typeof TRANSACTION_CLASSIFICATIONS)[number];

export const ASSIGNABLE_CLASSIFICATIONS = [
  "business",
  "personal",
  "payment",
] as const;

export type AssignableClassification =
  (typeof ASSIGNABLE_CLASSIFICATIONS)[number];

/** Only this classification feeds business revenue / expense / net on the dashboard. */
export const BUSINESS_PL_CLASSIFICATION = "business" as const;

export const DASHBOARD_BUCKET_CLASSIFICATIONS = [
  "business",
  "personal",
  "payment",
  "uncategorized",
] as const;

export type DashboardBucket = (typeof DASHBOARD_BUCKET_CLASSIFICATIONS)[number];

export function isAssignableClassification(
  value: string
): value is AssignableClassification {
  return (ASSIGNABLE_CLASSIFICATIONS as readonly string[]).includes(value);
}

export function isTransactionClassification(
  value: string
): value is TransactionClassification {
  return (TRANSACTION_CLASSIFICATIONS as readonly string[]).includes(value);
}

/** Maps a stored classification to exactly one dashboard bucket. */
export function dashboardBucketForClassification(
  classification: string
): DashboardBucket {
  if (classification === "business") return "business";
  if (classification === "personal") return "personal";
  if (classification === "payment") return "payment";
  return "uncategorized";
}

export function isIncludedInBusinessPl(classification: string): boolean {
  return classification === BUSINESS_PL_CLASSIFICATION;
}

export function classificationLabel(value: string) {
  switch (value) {
    case "business":
      return "Business";
    case "personal":
      return "Personal";
    case "payment":
      return "Payment";
    default:
      return "Uncategorized";
  }
}
