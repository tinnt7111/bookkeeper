"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { previewImport, confirmImport } from "@/app/actions/import";
import { formatDate, formatMoney } from "@/lib/format";
import { useMounted } from "@/lib/use-mounted";
import { statementTypeLabel } from "@/lib/banks/presets";
import { suggestProfileIdFromFilename } from "@/lib/banks/suggest-profile";

type PreviewRow = {
  date: Date | string;
  description: string;
  amount: string;
  direction: string;
  classification: string;
  cardLabel?: string | null;
  isDuplicate?: boolean;
  dedupeHash: string;
  rawDescription: string;
};

type PreviewResult = {
  error?: string;
  filename?: string;
  bankProfileId?: string;
  previewRows?: PreviewRow[];
  skippedCount?: number;
  dateFrom?: string | null;
  dateTo?: string | null;
  errors?: string[];
  duplicateCount?: number;
  hasCardColumn?: boolean;
};

type BankProfileOption = {
  id: string;
  presetKey: string;
  name: string;
  bankName: string;
  statementType: string;
  enabled: boolean;
  notes: string | null;
  dateColumn: string;
  amountColumn: string;
  descriptionColumn: string;
};

type ProfileSuggestion = {
  profileId: string;
  name: string;
  confidence: "high" | "medium";
};

function firstEnabledProfile(profiles: BankProfileOption[]) {
  return profiles.find((profile) => profile.enabled) ?? profiles[0];
}

export function ImportForm({
  bankProfiles,
  defaultProfileId,
}: {
  bankProfiles: BankProfileOption[];
  defaultProfileId: string;
}) {
  const mounted = useMounted();
  const [selectedProfileId, setSelectedProfileId] = useState(defaultProfileId);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [profileSuggestion, setProfileSuggestion] =
    useState<ProfileSuggestion | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedProfile = useMemo(
    () => bankProfiles.find((profile) => profile.id === selectedProfileId),
    [bankProfiles, selectedProfileId]
  );

  const selectedProfileEnabled = selectedProfile?.enabled ?? false;

  useEffect(() => {
    setSelectedProfileId(defaultProfileId);
  }, [defaultProfileId]);

  useEffect(() => {
    if (selectedProfile && !selectedProfile.enabled) {
      const fallback = firstEnabledProfile(bankProfiles);
      if (fallback) setSelectedProfileId(fallback.id);
    }
  }, [bankProfiles, selectedProfile]);

  function handleProfileChange(profileId: string) {
    const profile = bankProfiles.find((item) => item.id === profileId);
    if (!profile?.enabled) return;
    setSelectedProfileId(profileId);
    setPreview(null);
    setMessage(null);
  }

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setPreview(null);

    if (!file) {
      setSelectedFileName(null);
      setProfileSuggestion(null);
      return;
    }

    setSelectedFileName(file.name);
    const suggestion = suggestProfileIdFromFilename(file.name, bankProfiles);

    if (!suggestion) {
      setProfileSuggestion(null);
      return;
    }

    setProfileSuggestion({
      profileId: suggestion.profileId,
      name: suggestion.name,
      confidence: suggestion.confidence,
    });

    if (suggestion.confidence === "high") {
      setSelectedProfileId(suggestion.profileId);
      setMessage(`Selected ${suggestion.name} based on “${file.name}”.`);
    } else {
      setMessage(null);
    }
  }

  function applyProfileSuggestion() {
    if (!profileSuggestion) return;
    setSelectedProfileId(profileSuggestion.profileId);
    setMessage(
      selectedFileName
        ? `Selected ${profileSuggestion.name} based on “${selectedFileName}”.`
        : `Selected ${profileSuggestion.name}.`
    );
    setPreview(null);
  }

  const showSuggestionBanner =
    profileSuggestion !== null &&
    profileSuggestion.profileId !== selectedProfileId;

  return (
    <div className="space-y-6">
      <form
        className="panel panel-padded space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          if (!selectedProfileEnabled) return;

          const formData = new FormData(event.currentTarget);
          formData.set("bankProfileId", selectedProfileId);
          startTransition(async () => {
            setMessage(null);
            const result = await previewImport(formData);
            setPreview(result);
          });
        }}
      >
        <div>
          <label className="mb-1 block text-sm text-secondary">CSV file</label>
          {mounted ? (
            <input
              type="file"
              name="file"
              accept=".csv,text/csv"
              required
              disabled={!selectedProfileEnabled}
              onChange={handleFileChange}
              className="block w-full text-sm text-secondary file:mr-3 file:rounded file:border file:border-[var(--input-border)] file:bg-[var(--input-bg)] file:px-3 file:py-1.5 file:text-accent disabled:opacity-50"
            />
          ) : (
            <div
              aria-hidden
              className="block h-10 w-full rounded-md border border-[var(--input-border)] bg-[var(--input-bg)]"
            />
          )}
        </div>

        {showSuggestionBanner ? (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[var(--class-payment-border)] bg-[var(--class-payment-bg)] px-3 py-2 text-sm">
            <span className="text-secondary">
              Suggested profile for{" "}
              <strong className="text-primary">{selectedFileName}</strong>:{" "}
              {profileSuggestion.name}
            </span>
            <button
              type="button"
              className="btn-secondary"
              onClick={applyProfileSuggestion}
            >
              Use {profileSuggestion.name}
            </button>
          </div>
        ) : null}

        <div>
          <label className="mb-1 block text-sm text-secondary">
            Bank profile
          </label>
          <select
            name="bankProfileId"
            required
            value={selectedProfileId}
            onChange={(event) => handleProfileChange(event.target.value)}
            className="input"
          >
            {bankProfiles.map((profile) => (
              <option
                key={profile.id}
                value={profile.id}
                disabled={!profile.enabled}
                className={profile.enabled ? "" : "option-disabled"}
              >
                {profile.name}
                {!profile.enabled ? " (coming soon)" : ""}
              </option>
            ))}
          </select>
          {selectedProfile ? (
            <p className="mt-2 text-xs text-muted">
              {statementTypeLabel(selectedProfile.statementType)} ·{" "}
              {selectedProfile.notes ?? (
                <>
                  {selectedProfile.dateColumn}, {selectedProfile.descriptionColumn}
                  {selectedProfile.amountColumn
                    ? `, ${selectedProfile.amountColumn}`
                    : ""}
                </>
              )}
            </p>
          ) : null}
        </div>

        <button
          type="submit"
          disabled={pending || !selectedProfileEnabled}
          className="btn-primary"
        >
          {pending ? "Parsing..." : "Preview import"}
        </button>
      </form>

      {preview?.error ? <p className="message-error">{preview.error}</p> : null}

      {preview?.previewRows ? (
        <div className="panel panel-padded space-y-4">
          <div className="text-sm text-secondary">
            <p>
              <strong className="text-accent">{preview.previewRows.length}</strong>{" "}
              rows parsed
              {preview.dateFrom && preview.dateTo
                ? ` · ${formatDate(preview.dateFrom)} – ${formatDate(preview.dateTo)}`
                : ""}
            </p>
            <p>
              {preview.duplicateCount ?? 0} already in database ·{" "}
              {preview.skippedCount ?? 0} skipped
            </p>
          </div>

          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Description</th>
                  {preview.hasCardColumn ? <th>Card</th> : null}
                  <th>Amount</th>
                  <th>Class</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.previewRows.slice(0, 10).map((row, index) => (
                  <tr key={`${row.dedupeHash}-${index}`}>
                    <td className="whitespace-nowrap text-secondary">
                      {formatDate(row.date)}
                    </td>
                    <td>{row.description}</td>
                    {preview.hasCardColumn ? (
                      <td className="text-secondary">{row.cardLabel ?? "—"}</td>
                    ) : null}
                    <td className={`whitespace-nowrap ${row.direction === "debit" ? "amount-debit" : "amount-credit"}`}>
                      {row.direction === "debit" ? "-" : "+"}
                      {formatMoney(row.amount)}
                    </td>
                    <td className="capitalize">{row.classification}</td>
                    <td className="text-muted">
                      {row.isDuplicate ? "Already imported" : "New"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            disabled={pending}
            className="btn-success"
            onClick={() => {
              startTransition(async () => {
                const formData = new FormData();
                formData.set(
                  "payload",
                  JSON.stringify({
                    filename: preview.filename,
                    bankProfileId: preview.bankProfileId,
                    rows: preview.previewRows,
                    skippedCount: preview.skippedCount,
                    dateFrom: preview.dateFrom,
                    dateTo: preview.dateTo,
                  })
                );
                const result = await confirmImport(formData);
                if ("error" in result && result.error) {
                  setMessage(result.error);
                } else if (result.importedCount === 0) {
                  setMessage("No new rows imported — all were already in the database.");
                } else {
                  setMessage(
                    `Imported ${result.importedCount} rows (${result.duplicateCount} already imported, skipped).`
                  );
                  setPreview(null);
                }
              });
            }}
          >
            Confirm import
          </button>
        </div>
      ) : null}

      {message ? (
        <p
          className={
            message.includes("duplicates") && !message.includes("Imported")
              ? "message-warning"
              : "message-success"
          }
        >
          {message}
        </p>
      ) : null}

      {preview?.errors && preview.errors.length > 0 ? (
        <div className="message-warning">
          {preview.errors.slice(0, 5).map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      ) : null}
    </div>
  );
}
