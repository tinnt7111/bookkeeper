import { parse, isValid } from "date-fns";

const FORMATS = [
  "yyyy-MM-dd HH:mm:ss",
  "MM/dd/yyyy",
  "M/d/yyyy",
  "MM/dd/yy",
  "M/d/yy",
  "yyyy-MM-dd",
  "yyyy/MM/dd",
  "dd/MM/yyyy",
  "MM-dd-yyyy",
];

export function parseTransactionDate(
  value: string,
  preferredFormat?: string
): Date | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const formats = preferredFormat
    ? [preferredFormat, ...FORMATS.filter((f) => f !== preferredFormat)]
    : FORMATS;

  for (const format of formats) {
    const parsed = parse(trimmed, format, new Date());
    if (isValid(parsed)) {
      return new Date(
        Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate())
      );
    }
  }

  const fallback = new Date(trimmed);
  if (isValid(fallback)) {
    return new Date(
      Date.UTC(
        fallback.getFullYear(),
        fallback.getMonth(),
        fallback.getDate()
      )
    );
  }

  return null;
}
