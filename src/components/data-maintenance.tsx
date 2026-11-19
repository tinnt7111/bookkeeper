"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  clearAllTransactions,
  clearTransactionsForCard,
} from "@/app/actions/data-maintenance";

type CardOption = {
  id: string;
  name: string;
  transactionCount: number;
};

export function DataMaintenance({
  cards,
  totalTransactions,
}: {
  cards: CardOption[];
  totalTransactions: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cardId, setCardId] = useState(cards[0]?.id ?? "");
  const [cardConfirm, setCardConfirm] = useState("");
  const [allConfirm, setAllConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const selectedCard = cards.find((card) => card.id === cardId);

  function clearMessages() {
    setError(null);
    setMessage(null);
  }

  function handleClearCard() {
    clearMessages();
    startTransition(async () => {
      const result = await clearTransactionsForCard({
        cardId,
        confirmText: cardConfirm,
      });

      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      if (!("deletedTransactions" in result) || result.deletedTransactions === undefined) {
        setError("Clear failed.");
        return;
      }

      setCardConfirm("");
      setMessage(
        `Cleared ${result.deletedTransactions.toLocaleString()} transaction${
          result.deletedTransactions === 1 ? "" : "s"
        } and ${(result.deletedBatches ?? 0).toLocaleString()} import batch${
          result.deletedBatches === 1 ? "" : "es"
        } for “${result.cardName ?? "card"}”.`
      );
      router.refresh();
    });
  }

  function handleClearAll() {
    clearMessages();
    startTransition(async () => {
      const result = await clearAllTransactions({
        confirmText: allConfirm,
      });

      if ("error" in result && result.error) {
        setError(result.error);
        return;
      }

      if (!("deletedTransactions" in result) || result.deletedTransactions === undefined) {
        setError("Clear failed.");
        return;
      }

      setAllConfirm("");
      setMessage(
        `Cleared ${result.deletedTransactions.toLocaleString()} transaction${
          result.deletedTransactions === 1 ? "" : "s"
        } and ${(result.deletedBatches ?? 0).toLocaleString()} import batch${
          result.deletedBatches === 1 ? "" : "es"
        }. Cards and rules were kept.`
      );
      router.refresh();
    });
  }

  return (
    <section className="panel panel-padded space-y-5">
      <div>
        <h2 className="section-title">Data maintenance</h2>
        <p className="mt-1 text-sm text-secondary">
          Rarely needed. Clear transactions after a bad import or before
          reloading data after a schema change. Cards and classification rules
          are kept.
        </p>
      </div>

      {error ? <p className="message-error">{error}</p> : null}
      {message ? <p className="message-success">{message}</p> : null}

      <div className="space-y-3 border-b border-white/5 pb-5">
        <h3 className="text-sm font-medium text-primary">
          Clear one card ({totalTransactions.toLocaleString()} total transactions)
        </h3>
        <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <select
            className="input"
            value={cardId}
            onChange={(event) => {
              setCardId(event.target.value);
              setCardConfirm("");
              clearMessages();
            }}
            disabled={cards.length === 0 || pending}
          >
            {cards.length === 0 ? (
              <option value="">No cards</option>
            ) : (
              cards.map((card) => (
                <option key={card.id} value={card.id}>
                  {card.name} ({card.transactionCount.toLocaleString()})
                </option>
              ))
            )}
          </select>
          <input
            className="input"
            value={cardConfirm}
            onChange={(event) => setCardConfirm(event.target.value)}
            placeholder={
              selectedCard
                ? `Type “${selectedCard.name}” to confirm`
                : "Type card name"
            }
            disabled={!selectedCard || pending}
          />
          <button
            type="button"
            className="btn-secondary"
            disabled={
              pending ||
              !selectedCard ||
              cardConfirm.trim() !== selectedCard.name
            }
            onClick={handleClearCard}
          >
            Clear card
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h3 className="text-sm font-medium text-primary">Clear all transactions</h3>
        <p className="text-xs text-muted">
          Deletes every transaction and import batch for your account.
        </p>
        <div className="flex flex-wrap gap-3">
          <input
            className="input max-w-xs"
            value={allConfirm}
            onChange={(event) => setAllConfirm(event.target.value)}
            placeholder='Type “CLEAR ALL” to confirm'
            disabled={pending || totalTransactions === 0}
          />
          <button
            type="button"
            className="btn-secondary"
            disabled={
              pending ||
              totalTransactions === 0 ||
              allConfirm.trim().toUpperCase() !== "CLEAR ALL"
            }
            onClick={handleClearAll}
          >
            Clear all
          </button>
        </div>
      </div>
    </section>
  );
}
