"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
  bulkClassifyFiltered,
  bulkUpdateClassification,
} from "@/app/actions/transactions";
import { createRuleFromSearch } from "@/app/actions/rules";
import { ClassificationSelect } from "@/components/classification-select";
import {
  classificationButtonClass,
  classificationOptionClass,
  classificationRowClass,
  classificationSelectClass,
} from "@/lib/classification-styles";
import type { AssignableClassification } from "@/lib/classifications";
import { formatDate, formatMoney } from "@/lib/format";

export type TransactionRow = {
  id: string;
  date: string;
  description: string;
  amount: string;
  direction: string;
  classification: string;
  cardLabel: string | null;
  bankProfileName: string;
};

type TransactionsTableProps = {
  transactions: TransactionRow[];
  showCardColumn: boolean;
  search: string;
  selectedYear: number;
  filter: string;
  month?: string;
  source?: string;
  totalCount: number;
};

function ruleNameFromPattern(pattern: string) {
  const trimmed = pattern.trim();
  if (!trimmed) return "New rule";
  return trimmed.length > 32 ? `${trimmed.slice(0, 32)}…` : trimmed;
}

export function TransactionsTable({
  transactions,
  showCardColumn,
  search,
  selectedYear,
  filter,
  month,
  source,
  totalCount,
}: TransactionsTableProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [lastSelectedId, setLastSelectedId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ruleClassification, setRuleClassification] =
    useState<AssignableClassification>("business");
  const [ruleName, setRuleName] = useState(() => ruleNameFromPattern(search));
  const [showRuleForm, setShowRuleForm] = useState(Boolean(search));

  useEffect(() => {
    setRuleName(ruleNameFromPattern(search));
    if (search) setShowRuleForm(true);
  }, [search]);

  const filterParams = {
    year: String(selectedYear),
    month,
    filter,
    source,
    q: search || undefined,
  };

  const selectedCount = selectedIds.size;
  const hasSearch = search.length > 0;

  const toggleSelect = useCallback(
    (id: string, shiftKey: boolean, ctrlKey: boolean) => {
      setSelectedIds((prev) => {
        const next = new Set(prev);

        if (shiftKey && lastSelectedId) {
          const ids = transactions.map((txn) => txn.id);
          const start = ids.indexOf(lastSelectedId);
          const end = ids.indexOf(id);
          if (start !== -1 && end !== -1) {
            const [from, to] = start < end ? [start, end] : [end, start];
            for (let i = from; i <= to; i += 1) {
              next.add(ids[i]);
            }
            return next;
          }
        }

        if (ctrlKey || shiftKey) {
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
        }

        if (next.size === 1 && next.has(id)) {
          next.clear();
          return next;
        }

        next.clear();
        next.add(id);
        return next;
      });
      setLastSelectedId(id);
    },
    [lastSelectedId, transactions]
  );

  function clearSelection() {
    setSelectedIds(new Set());
    setLastSelectedId(null);
  }

  function runBulkSelected(classification: AssignableClassification) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await bulkUpdateClassification(
        [...selectedIds],
        classification
      );
      setMessage(
        `Updated ${result.updatedCount} selected transaction${result.updatedCount === 1 ? "" : "s"}.`
      );
      clearSelection();
      router.refresh();
    });
  }

  function runBulkFiltered(classification: AssignableClassification) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await bulkClassifyFiltered({
        ...filterParams,
        classification,
      });
      setMessage(
        `Updated ${result.updatedCount} transaction${result.updatedCount === 1 ? "" : "s"} matching your current filters.`
      );
      clearSelection();
      router.refresh();
    });
  }

  function runCreateRule(applyToFiltered: boolean) {
    if (!search.trim()) {
      setError("Enter a search term to create a rule from.");
      return;
    }

    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await createRuleFromSearch({
        name: ruleName.trim() || ruleNameFromPattern(search),
        pattern: search.trim(),
        classification: ruleClassification,
        applyToFiltered,
        ...filterParams,
        q: search.trim(),
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setMessage(
        applyToFiltered
          ? `Rule saved and applied to ${result.updatedCount ?? 0} transaction${result.updatedCount === 1 ? "" : "s"}.`
          : "Rule saved. Manage it in Settings."
      );
      setShowRuleForm(false);
      router.refresh();
    });
  }

  const showBulkBar = selectedCount > 0 || hasSearch;

  return (
    <div className="space-y-3">
      {showBulkBar ? (
        <section className="panel panel-padded bulk-actions">
          {selectedCount > 0 ? (
            <div className="bulk-actions-row">
              <span className="bulk-actions-label">
                {selectedCount} selected · Ctrl/Cmd+click to multi-select
              </span>
              <div className="bulk-actions-buttons">
                <button
                  type="button"
                  disabled={pending}
                  className={`btn-secondary ${classificationButtonClass("business")}`}
                  onClick={() => runBulkSelected("business")}
                >
                  Mark business
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className={`btn-secondary ${classificationButtonClass("personal")}`}
                  onClick={() => runBulkSelected("personal")}
                >
                  Mark personal
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className={`btn-secondary ${classificationButtonClass("payment")}`}
                  onClick={() => runBulkSelected("payment")}
                >
                  Mark payment
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className="btn-secondary"
                  onClick={clearSelection}
                >
                  Clear
                </button>
              </div>
            </div>
          ) : null}

          {hasSearch ? (
            <div className={selectedCount > 0 ? "bulk-actions-row mt-3 border-t border-white/5 pt-3" : "bulk-actions-row"}>
              <span className="bulk-actions-label">
                Search “{search}” · {totalCount.toLocaleString()} matching
              </span>
              <div className="bulk-actions-buttons">
                <button
                  type="button"
                  disabled={pending}
                  className={`btn-secondary ${classificationButtonClass("business")}`}
                  onClick={() => runBulkFiltered("business")}
                >
                  All → business
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className={`btn-secondary ${classificationButtonClass("personal")}`}
                  onClick={() => runBulkFiltered("personal")}
                >
                  All → personal
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className={`btn-secondary ${classificationButtonClass("payment")}`}
                  onClick={() => runBulkFiltered("payment")}
                >
                  All → payment
                </button>
                <button
                  type="button"
                  disabled={pending}
                  className="btn-secondary"
                  onClick={() => setShowRuleForm((value) => !value)}
                >
                  {showRuleForm ? "Hide rule" : "Create rule"}
                </button>
              </div>
            </div>
          ) : null}

          {hasSearch && showRuleForm ? (
            <div className="bulk-rule-form mt-3 border-t border-white/5 pt-3">
              <p className="text-sm text-secondary">
                Save a rule: description contains{" "}
                <strong className="text-primary">“{search}”</strong>
              </p>
              <div className="mt-2 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                <input
                  className="input"
                  value={ruleName}
                  onChange={(event) => setRuleName(event.target.value)}
                  placeholder="Rule name"
                />
                <select
                  className={`input input-inline select-class min-w-[8rem] ${classificationSelectClass(ruleClassification)}`}
                  value={ruleClassification}
                  onChange={(event) =>
                    setRuleClassification(
                      event.target.value as AssignableClassification
                    )
                  }
                >
                  <option value="business" className={classificationOptionClass("business")}>
                    Business
                  </option>
                  <option value="personal" className={classificationOptionClass("personal")}>
                    Personal
                  </option>
                  <option value="payment" className={classificationOptionClass("payment")}>
                    Payment
                  </option>
                </select>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending}
                    className="btn-secondary"
                    onClick={() => runCreateRule(false)}
                  >
                    Save rule
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    className="btn-success"
                    onClick={() => runCreateRule(true)}
                  >
                    Save & apply to search
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </section>
      ) : (
        <p className="text-xs text-muted">
          Ctrl/Cmd+click rows to select · Shift+click for range
        </p>
      )}

      {error ? <p className="message-error">{error}</p> : null}
      {message ? <p className="message-success">{message}</p> : null}

      <section className="panel panel-table">
        <div className="table-scroll">
          <table className="data-table txn-table">
            <thead>
              <tr>
                <th className="col-date">Date</th>
                <th className="col-source">Source</th>
                <th className="col-description">Description</th>
                {showCardColumn ? <th className="col-card">Card</th> : null}
                <th className="col-amount">Amount</th>
                <th className="col-type">Type</th>
                <th className="col-class">Class</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td
                    colSpan={showCardColumn ? 7 : 6}
                    className="empty-cell text-muted"
                  >
                    No transactions found.
                  </td>
                </tr>
              ) : (
                transactions.map((txn) => {
                  const isSelected = selectedIds.has(txn.id);
                  return (
                    <tr
                      key={txn.id}
                      className={`${classificationRowClass(txn.classification)} ${isSelected ? "row-selected" : ""} txn-row-selectable`}
                      onClick={(event) => {
                        if (
                          (event.target as HTMLElement).closest("select, button, a")
                        ) {
                          return;
                        }
                        toggleSelect(
                          txn.id,
                          event.shiftKey,
                          event.ctrlKey || event.metaKey
                        );
                      }}
                    >
                      <td className="whitespace-nowrap text-secondary">
                        {formatDate(txn.date)}
                      </td>
                      <td
                        className="col-source text-muted"
                        title={txn.bankProfileName}
                      >
                        {txn.bankProfileName}
                      </td>
                      <td className="col-description">{txn.description}</td>
                      {showCardColumn ? (
                        <td className="text-muted">{txn.cardLabel ?? "—"}</td>
                      ) : null}
                      <td
                        className={`whitespace-nowrap font-medium ${
                          txn.direction === "debit"
                            ? "amount-debit"
                            : "amount-credit"
                        }`}
                      >
                        {txn.direction === "debit" ? "−" : "+"}
                        {formatMoney(txn.amount)}
                      </td>
                      <td className="capitalize text-muted">{txn.direction}</td>
                      <td onClick={(event) => event.stopPropagation()}>
                        <ClassificationSelect
                          transactionId={txn.id}
                          value={txn.classification}
                        />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
