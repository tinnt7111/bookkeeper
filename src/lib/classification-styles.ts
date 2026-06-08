export type ClassificationValue =
  | "business"
  | "personal"
  | "payment"
  | "uncategorized";

export function normalizeClassification(value: string): ClassificationValue {
  if (
    value === "business" ||
    value === "personal" ||
    value === "payment"
  ) {
    return value;
  }
  return "uncategorized";
}

export function classificationRowClass(classification: string) {
  switch (normalizeClassification(classification)) {
    case "business":
      return "row-class-business";
    case "personal":
      return "row-class-personal";
    case "payment":
      return "row-class-payment";
    default:
      return "row-class-uncategorized";
  }
}

export function classificationSelectClass(classification: string) {
  switch (normalizeClassification(classification)) {
    case "business":
      return "select-class-business";
    case "personal":
      return "select-class-personal";
    case "payment":
      return "select-class-payment";
    default:
      return "select-class-uncategorized";
  }
}
