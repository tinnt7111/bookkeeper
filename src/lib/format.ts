const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function toDate(date: Date | string) {
  return typeof date === "string" ? new Date(date) : date;
}

export function formatMoney(value: string | number) {
  const amount = typeof value === "string" ? parseFloat(value) : value;
  if (!Number.isFinite(amount)) return "$0.00";

  const negative = amount < 0;
  const abs = Math.abs(amount);
  const [intPart, decPart = "00"] = abs.toFixed(2).split(".");
  const withCommas = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

  return `${negative ? "-" : ""}$${withCommas}.${decPart}`;
}

export function formatDate(date: Date | string) {
  const d = toDate(date);
  return `${MONTHS_SHORT[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

export function formatMonth(monthKey: string) {
  const [year, month] = monthKey.split("-");
  const monthIndex = Number(month) - 1;

  if (monthIndex < 0 || monthIndex > 11 || !year) {
    return monthKey;
  }

  return `${MONTHS_LONG[monthIndex]} ${year}`;
}

import { classificationLabel } from "@/lib/classifications";

export { classificationLabel };
