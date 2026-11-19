"use client";

import { FormEvent, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCard, deleteCard } from "@/app/actions/cards";
import { formatDate } from "@/lib/format";

export type ManagedCard = {
  id: string;
  name: string;
  transactionCount: number;
  dateFrom: string | null;
  dateTo: string | null;
};

export function CardManager({ cards }: { cards: ManagedCard[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await createCard(formData);
      if (result.error) {
        setError(result.error);
        return;
      }

      setName("");
      setMessage(`Added card “${result.card?.name}”.`);
      router.refresh();
    });
  }

  function handleDelete(card: ManagedCard) {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      const result = await deleteCard(card.id);
      if (result.error) {
        setError(result.error);
        return;
      }

      setMessage(`Removed card “${card.name}”.`);
      router.refresh();
    });
  }

  return (
    <section className="panel panel-padded space-y-4">
      <div>
        <h2 className="section-title">Cards</h2>
        <p className="mt-1 text-sm text-secondary">
          Select a card on every import. Cards identify the account for
          duplicate detection and show the transaction date range covered.
        </p>
      </div>

      <form className="flex flex-wrap gap-2" onSubmit={handleCreate}>
        <input
          name="name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="e.g. Chase Sapphire, Capital One 3372"
          className="input max-w-md flex-1"
          maxLength={64}
          required
        />
        <button type="submit" className="btn-secondary" disabled={pending}>
          {pending ? "Saving…" : "Add card"}
        </button>
      </form>

      {error ? <p className="message-error">{error}</p> : null}
      {message ? <p className="message-success">{message}</p> : null}

      {cards.length === 0 ? (
        <p className="text-sm text-muted">
          No cards yet. Add one before importing.
        </p>
      ) : (
        <ul className="space-y-3">
          {cards.map((card) => (
            <li
              key={card.id}
              className="flex flex-wrap items-start justify-between gap-3 border-b border-white/5 pb-3 last:border-b-0 last:pb-0"
            >
              <div>
                <p className="font-medium text-primary">{card.name}</p>
                <p className="mt-0.5 text-sm text-secondary">
                  {card.transactionCount.toLocaleString()} transaction
                  {card.transactionCount === 1 ? "" : "s"}
                  {card.dateFrom && card.dateTo
                    ? ` · ${formatDate(card.dateFrom)} – ${formatDate(card.dateTo)}`
                    : " · no imports yet"}
                </p>
              </div>
              <button
                type="button"
                className="btn-secondary"
                disabled={pending}
                onClick={() => handleDelete(card)}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
