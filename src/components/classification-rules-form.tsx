"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  applyAllRules,
  applyRule,
  createRule,
  deleteRule,
  previewAllRules,
  previewRule,
  previewRulePattern,
  updateRule,
} from "@/app/actions/rules";
import { classificationLabel, formatDate, formatMoney } from "@/lib/format";
import type { AssignableClassification } from "@/lib/classifications";
import { isAssignableClassification } from "@/lib/classifications";

type Rule = {
  id: string;
  name: string;
  pattern: string;
  matchType: string;
  classification: string;
};

type EditingRule = {
  id: string;
  name: string;
  pattern: string;
  classification: AssignableClassification;
};

type PreviewMatch = {
  id: string;
  date: string;
  description: string;
  amount: string;
  direction: string;
  classification: string;
  ruleName?: string;
  ruleId?: string;
};

type PreviewState = {
  title: string;
  matches: PreviewMatch[];
  applyMode: "single" | "all" | "draft" | null;
  ruleId?: string;
  draftPattern?: string;
  draftClassification?: AssignableClassification;
};

export function ClassificationRulesForm({ rules }: { rules: Rule[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  const [name, setName] = useState("");
  const [pattern, setPattern] = useState("");
  const [classification, setClassification] =
    useState<AssignableClassification>("business");
  const [editingRule, setEditingRule] = useState<EditingRule | null>(null);

  function clearMessages() {
    setMessage(null);
    setError(null);
  }

  function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();

    const formData = new FormData(event.currentTarget);
    startTransition(async () => {
      const result = await createRule(formData);
      if (result.error) {
        setError(result.error);
        return;
      }

      setName("");
      setPattern("");
      setClassification("business");
      setPreview(null);
      setMessage("Rule saved.");
      router.refresh();
    });
  }

  function handlePreviewDraft() {
    clearMessages();
    startTransition(async () => {
      const result = await previewRulePattern(pattern, classification);
      if (result.error) {
        setError(result.error);
        setPreview(null);
        return;
      }

      setPreview({
        title: `Preview: description contains "${pattern}" → ${classificationLabel(classification)}`,
        matches: result.matches ?? [],
        applyMode: null,
      });
    });
  }

  function handlePreviewRule(ruleId: string) {
    clearMessages();
    startTransition(async () => {
      const result = await previewRule(ruleId);
      if (result.error) {
        setError(result.error);
        setPreview(null);
        return;
      }

      setPreview({
        title: `Preview: ${result.ruleName} (${result.matchCount ?? 0} uncategorized)`,
        matches: result.matches ?? [],
        applyMode: "single",
        ruleId,
      });
    });
  }

  function handlePreviewAll() {
    clearMessages();
    startTransition(async () => {
      const result = await previewAllRules();
      if (result.error) {
        setError(result.error);
        setPreview(null);
        return;
      }

      setPreview({
        title: `Preview all rules (${result.matchCount ?? 0} uncategorized)`,
        matches: result.matches ?? [],
        applyMode: "all",
      });
    });
  }

  function handleApply() {
    if (!preview?.applyMode) return;
    clearMessages();

    startTransition(async () => {
      if (preview.applyMode === "single" && preview.ruleId) {
        const result = await applyRule(preview.ruleId);
        if (result.error) {
          setError(result.error);
          return;
        }
        setMessage(
          result.appliedCount === 0
            ? "No uncategorized transactions matched this rule."
            : `Applied "${result.ruleName}" to ${result.appliedCount} transaction${result.appliedCount === 1 ? "" : "s"}.`
        );
      } else if (preview.applyMode === "all") {
        const result = await applyAllRules();
        if (result.error) {
          setError(result.error);
          return;
        }
        setMessage(
          result.appliedCount === 0
            ? "No uncategorized transactions matched any rule."
            : `Applied all rules to ${result.appliedCount} transaction${result.appliedCount === 1 ? "" : "s"}.`
        );
      }

      setPreview(null);
      router.refresh();
    });
  }

  function handleApplyRule(ruleId: string, ruleName: string) {
    clearMessages();
    startTransition(async () => {
      const result = await applyRule(ruleId);
      if (result.error) {
        setError(result.error);
        return;
      }

      setMessage(
        result.appliedCount === 0
          ? `No uncategorized transactions matched "${ruleName}".`
          : `Applied "${ruleName}" to ${result.appliedCount} transaction${result.appliedCount === 1 ? "" : "s"}.`
      );
      setPreview(null);
      router.refresh();
    });
  }

  function handleApplyAllDirect() {
    clearMessages();
    startTransition(async () => {
      const result = await applyAllRules();
      if (result.error) {
        setError(result.error);
        return;
      }

      setMessage(
        result.appliedCount === 0
          ? "No uncategorized transactions matched any rule."
          : `Applied all rules to ${result.appliedCount} transaction${result.appliedCount === 1 ? "" : "s"}.`
      );
      setPreview(null);
      router.refresh();
    });
  }

  function handleDelete(ruleId: string) {
    clearMessages();
    startTransition(async () => {
      await deleteRule(ruleId);
      if (preview?.ruleId === ruleId) setPreview(null);
      if (editingRule?.id === ruleId) setEditingRule(null);
      setMessage("Rule deleted.");
      router.refresh();
    });
  }

  function startEditing(rule: Rule) {
    clearMessages();
    setPreview(null);
    setEditingRule({
      id: rule.id,
      name: rule.name,
      pattern: rule.pattern,
      classification: isAssignableClassification(rule.classification)
        ? rule.classification
        : "business",
    });
  }

  function cancelEditing() {
    setEditingRule(null);
  }

  function handleSaveEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingRule) return;

    clearMessages();
    startTransition(async () => {
      const result = await updateRule({
        ruleId: editingRule.id,
        name: editingRule.name,
        pattern: editingRule.pattern,
        classification: editingRule.classification,
      });

      if (result.error) {
        setError(result.error);
        return;
      }

      setEditingRule(null);
      setPreview(null);
      setMessage("Rule updated.");
      router.refresh();
    });
  }

  function handlePreviewEdit() {
    if (!editingRule) return;

    clearMessages();
    startTransition(async () => {
      const result = await previewRulePattern(
        editingRule.pattern,
        editingRule.classification
      );
      if (result.error) {
        setError(result.error);
        setPreview(null);
        return;
      }

      setPreview({
        title: `Preview: description contains "${editingRule.pattern}" → ${classificationLabel(editingRule.classification)}`,
        matches: result.matches ?? [],
        applyMode: null,
      });
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={pending || rules.length === 0}
          onClick={handlePreviewAll}
          className="btn-secondary"
        >
          Preview all rules
        </button>
        <button
          type="button"
          disabled={pending || rules.length === 0}
          onClick={handleApplyAllDirect}
          className="btn-primary"
        >
          Apply all rules
        </button>
      </div>

      <form onSubmit={handleCreate} className="space-y-3 border-b border-white/5 pb-4">
        <p className="text-sm text-secondary">
          Match uncategorized transactions whose description contains your text.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-muted">Rule name</label>
            <input
              name="name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Netflix"
              required
              className="input"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">
              Description contains
            </label>
            <input
              name="pattern"
              value={pattern}
              onChange={(event) => setPattern(event.target.value)}
              placeholder="e.g. netflix"
              required
              className="input"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-muted">Classify as</label>
            <select
              name="classification"
              value={classification}
              onChange={(event) =>
                setClassification(event.target.value as AssignableClassification)
              }
              className="input"
            >
              <option value="business">Business</option>
              <option value="personal">Personal</option>
              <option value="payment">Payment</option>
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={pending || !pattern.trim()}
            onClick={handlePreviewDraft}
            className="btn-secondary"
          >
            Preview rule
          </button>
          <button type="submit" disabled={pending} className="btn-primary">
            Save rule
          </button>
        </div>
      </form>

      {rules.length === 0 ? (
        <p className="text-sm text-muted">No rules yet. Add one above.</p>
      ) : (
        <ul className="space-y-2 text-sm">
          {rules.map((rule) =>
            editingRule?.id === rule.id ? (
              <li
                key={rule.id}
                className="border-b border-white/5 py-3"
              >
                <form onSubmit={handleSaveEdit} className="space-y-3">
                  <p className="font-medium text-primary">Edit rule</p>
                  <div className="grid gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1 block text-xs text-muted">
                        Rule name
                      </label>
                      <input
                        value={editingRule.name}
                        onChange={(event) =>
                          setEditingRule((current) =>
                            current
                              ? { ...current, name: event.target.value }
                              : current
                          )
                        }
                        required
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted">
                        Description contains
                      </label>
                      <input
                        value={editingRule.pattern}
                        onChange={(event) =>
                          setEditingRule((current) =>
                            current
                              ? { ...current, pattern: event.target.value }
                              : current
                          )
                        }
                        required
                        className="input"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-muted">
                        Classify as
                      </label>
                      <select
                        value={editingRule.classification}
                        onChange={(event) =>
                          setEditingRule((current) =>
                            current
                              ? {
                                  ...current,
                                  classification: event.target
                                    .value as AssignableClassification,
                                }
                              : current
                          )
                        }
                        className="input"
                      >
                        <option value="business">Business</option>
                        <option value="personal">Personal</option>
                        <option value="payment">Payment</option>
                      </select>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pending || !editingRule.pattern.trim()}
                      onClick={handlePreviewEdit}
                      className="btn-secondary"
                    >
                      Preview
                    </button>
                    <button type="submit" disabled={pending} className="btn-primary">
                      Save changes
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={cancelEditing}
                      className="btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </li>
            ) : (
              <li
                key={rule.id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 py-2"
              >
                <div>
                  <span className="font-medium text-primary">{rule.name}</span>
                  <span className="text-muted">
                    {" "}
                    · {rule.matchType} &quot;{rule.pattern}&quot; →{" "}
                    {classificationLabel(rule.classification)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={pending || editingRule !== null}
                    onClick={() => startEditing(rule)}
                    className="btn-secondary"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    disabled={pending || editingRule !== null}
                    onClick={() => handlePreviewRule(rule.id)}
                    className="btn-secondary"
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    disabled={pending || editingRule !== null}
                    onClick={() => handleApplyRule(rule.id, rule.name)}
                    className="btn-primary"
                  >
                    Apply
                  </button>
                  <button
                    type="button"
                    disabled={pending || editingRule !== null}
                    onClick={() => handleDelete(rule.id)}
                    className="btn-secondary"
                  >
                    Delete
                  </button>
                </div>
              </li>
            )
          )}
        </ul>
      )}

      {preview ? (
        <div className="panel space-y-4 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-medium text-heading">{preview.title}</h3>
            {preview.applyMode ? (
              <button
                type="button"
                disabled={pending || preview.matches.length === 0}
                onClick={handleApply}
                className="btn-success"
              >
                Apply
              </button>
            ) : null}
          </div>

          {preview.matches.length === 0 ? (
            <p className="text-sm text-muted">
              No uncategorized transactions match.
            </p>
          ) : (
            <>
              <p className="text-sm text-secondary">
                {preview.matches.length} uncategorized transaction
                {preview.matches.length === 1 ? "" : "s"} would be classified.
              </p>
              <div className="table-wrap">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Description</th>
                      <th>Amount</th>
                      <th>Would become</th>
                      {preview.applyMode === "all" ? <th>Rule</th> : null}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.matches.slice(0, 50).map((row) => (
                      <tr key={row.id}>
                        <td className="whitespace-nowrap text-secondary">
                          {formatDate(row.date)}
                        </td>
                        <td>{row.description}</td>
                        <td className={`whitespace-nowrap ${row.direction === "debit" ? "amount-debit" : "amount-credit"}`}>
                          {row.direction === "debit" ? "-" : "+"}
                          {formatMoney(row.amount)}
                        </td>
                        <td className="capitalize">
                          {classificationLabel(row.classification)}
                        </td>
                        {preview.applyMode === "all" ? (
                          <td className="text-secondary">{row.ruleName}</td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {preview.matches.length > 50 ? (
                <p className="text-xs text-muted">
                  Showing first 50 of {preview.matches.length}.
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {error ? <p className="message-error">{error}</p> : null}
      {message ? <p className="message-success">{message}</p> : null}
    </div>
  );
}
