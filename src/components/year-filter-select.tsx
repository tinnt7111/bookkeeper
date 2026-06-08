"use client";

import { useRouter } from "next/navigation";

type YearFilterSelectProps = {
  years: number[];
  selectedYear: number;
  basePath: string;
  extraParams?: Record<string, string | undefined>;
  label?: string;
};

function buildHref(
  basePath: string,
  year: number,
  extraParams?: Record<string, string | undefined>
) {
  const params = new URLSearchParams();
  params.set("year", String(year));

  if (extraParams) {
    for (const [key, value] of Object.entries(extraParams)) {
      if (value) params.set(key, value);
    }
  }

  return `${basePath}?${params.toString()}`;
}

export function YearFilterSelect({
  years,
  selectedYear,
  basePath,
  extraParams,
  label = "Year",
}: YearFilterSelectProps) {
  const router = useRouter();

  return (
    <label className="filter-field">
      <span className="filter-label">{label}</span>
      <select
        className="input input-inline min-w-[5.5rem]"
        value={selectedYear}
        onChange={(event) => {
          router.push(
            buildHref(basePath, Number(event.target.value), extraParams)
          );
        }}
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </label>
  );
}
