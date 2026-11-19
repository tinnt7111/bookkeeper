export function daysInYear(year: number) {
  const isLeap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  return isLeap ? 366 : 365;
}

function utcDayIndex(date: Date) {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function daysBetweenInclusive(from: Date, to: Date) {
  const diff = utcDayIndex(to) - utcDayIndex(from);
  return diff >= 0 ? diff + 1 : 0;
}

export interface YearCoverage {
  year: number;
  percent: number;
  overlapDays: number;
  yearDays: number;
}

export function getImportYearCoverage(
  dateFrom: Date | null,
  dateTo: Date | null,
  year: number
): YearCoverage | null {
  if (!dateFrom || !dateTo) {
    return null;
  }

  const yearStart = new Date(Date.UTC(year, 0, 1));
  const yearEnd = new Date(Date.UTC(year, 11, 31));
  const yearDays = daysInYear(year);

  if (dateTo < yearStart || dateFrom > yearEnd) {
    return { year, percent: 0, overlapDays: 0, yearDays };
  }

  const overlapFrom = dateFrom > yearStart ? dateFrom : yearStart;
  const overlapTo = dateTo < yearEnd ? dateTo : yearEnd;
  const overlapDays = daysBetweenInclusive(overlapFrom, overlapTo);
  const percent = Math.min(100, (overlapDays / yearDays) * 100);

  return {
    year,
    percent,
    overlapDays,
    yearDays,
  };
}
