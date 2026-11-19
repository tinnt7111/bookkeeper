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
  cardId?: string;
  cardName?: string;
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

type CardOption = {
  id: string;
  name: string;
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
  cards,
  defaultProfileId,
}: {
  bankProfiles: BankProfileOption[];
  cards: CardOption[];
  defaultProfileId: string;
}) {
  const mounted = useMounted();
  const [selectedProfileId, setSelectedProfileId] = useState(defaultProfileId);
  const [selectedCardId, setSelectedCardId] = useState(cards[0]?.id ?? "");
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

  const selectedCard = useMemo(
    () => cards.find((card) => card.id === selectedCardId),
    [cards, selectedCardId]
  );

  const selectedProfileEnabled = selectedProfile?.enabled ?? false;
  const canImport = selectedProfileEnabled && Boolean(selectedCardId);

  useEffect(() => {
    setSelectedProfileId(defaultProfileId);
  }, [defaultProfileId]);

  useEffect(() => {
    if (!cards.some((card) => card.id === selectedCardId)) {
      setSelectedCardId(cards[0]?.id ?? "");
    }
  }, [cards, selectedCardId]);

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

  function handleCardChange(cardId: string) {
    setSelectedCardId(cardId);
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
          if (!canImport) return;

          const formData = new FormData(event.currentTarget);
          formData.set("bankProfileId", selectedProfileId);
          formData.set("cardId", selectedCardId);
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
              disabled={!canImport}
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

        <div className="grid gap-4 sm:grid-cols-2">
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
                    {selectedProfile.dateColumn},{" "}
                    {selectedProfile.descriptionColumn}
                    {selectedProfile.amountColumn
                      ? `, ${selectedProfile.amountColumn}`
                      : ""}
                  </>
                )}
              </p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm text-secondary">Card</label>
            <select
              name="cardId"
              required
              value={selectedCardId}
              onChange={(event) => handleCardChange(event.target.value)}
              className="input"
              disabled={cards.length === 0}
            >
              {cards.length === 0 ? (
                <option value="">Add a card first</option>
              ) : (
                cards.map((card) => (
                  <option key={card.id} value={card.id}>
                    {card.name}
                  </option>
                ))
              )}
            </select>
            <p className="mt-2 text-xs text-muted">
              Used for duplicate detection. Same CSV re-imported on this card
              skips already stored rows.
            </p>
          </div>
        </div>

        <button
          type="submit"
          disabled={pending || !canImport}
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
              {preview.cardName ? ` · card ${preview.cardName}` : ""}
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
                  <th>Card</th>
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
                    <td className="text-secondary">
                      {row.cardLabel ?? selectedCard?.name ?? "—"}
                    </td>
                    <td
                      className={`whitespace-nowrap ${
                        row.direction === "debit"
                          ? "amount-debit"
                          : "amount-credit"
                      }`}
                    >
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
                    cardId: preview.cardId ?? selectedCardId,
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
                  setMessage(
                    "No new rows imported — all were already in the database."
                  );
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
