"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { formatMonth } from "@/lib/format";

type TransactionFiltersProps = {
  selectedYear: number;
  years: number[];
  months: string[];
  selectedMonth?: string;
  filter: string;
  search: string;
};

function buildHref({
  year,
  filter,
  month,
  search,
}: {
  year: number;
  filter: string;
  month?: string;
  search?: string;
}) {
  const params = new URLSearchParams();
  params.set("year", String(year));
  params.set("filter", filter);
  if (month) params.set("month", month);
  if (search?.trim()) params.set("q", search.trim());
  return `/transactions?${params.toString()}`;
}

export function TransactionFilters({
  selectedYear,
  years,
  months,
  selectedMonth,
  filter,
  search,
}: TransactionFiltersProps) {
  const router = useRouter();
  const [query, setQuery] = useState(search);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    router.push(
      buildHref({
        year: selectedYear,
        filter,
        month: selectedMonth,
        search: query,
      })
    );
  }

  return (
    <section className="panel filter-panel">
      <div className="filter-row">
        <label className="filter-field">
          <span className="filter-label">Year</span>
          <select
            className="input input-inline min-w-[5.5rem]"
            value={selectedYear}
            onChange={(event) => {
              router.push(
                buildHref({
                  year: Number(event.target.value),
                  filter,
                  search: query,
                })
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

        <label className="filter-field">
          <span className="filter-label">Month</span>
          <select
            className="input input-inline min-w-[8rem]"
            value={selectedMonth ?? ""}
            onChange={(event) => {
              router.push(
                buildHref({
                  year: selectedYear,
                  filter,
                  month: event.target.value || undefined,
                  search: query,
                })
              );
            }}
          >
            <option value="">All months</option>
            {months.map((month) => (
              <option key={month} value={month}>
                {formatMonth(month)}
              </option>
            ))}
          </select>
        </label>

        <form className="filter-field filter-search" onSubmit={submitSearch}>
          <span className="filter-label">Description</span>
          <div className="filter-search-row">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search description…"
              className="input"
            />
            <button type="submit" className="btn-secondary">
              Search
            </button>
            {search ? (
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setQuery("");
                  router.push(
                    buildHref({
                      year: selectedYear,
                      filter,
                      month: selectedMonth,
                    })
                  );
                }}
              >
                Clear
              </button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="filter-row filter-chips-row">
        {[
          ["all", "All"],
          ["uncategorized", "Uncategorized"],
          ["business", "Business"],
          ["personal", "Personal"],
          ["payment", "Payment"],
        ].map(([value, label]) => (
          <a
            key={value}
            href={buildHref({
              year: selectedYear,
              filter: value,
              month: selectedMonth,
              search,
            })}
            className={`chip chip-class-${value === "all" ? "all" : value} ${
              filter === value ? "chip-active" : ""
            }`}
          >
            {label}
          </a>
        ))}
      </div>
    </section>
  );
}
