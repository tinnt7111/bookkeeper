import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { CardManager } from "@/components/card-manager";
import { ImportForm } from "@/components/import-form";
import { ImportHistory } from "@/components/import-history";
import { ensureBankProfilesForUser } from "@/lib/banks/ensure-profiles";
import { BANK_PRESETS, isBankEnabled } from "@/lib/banks/presets";
import { getCurrentYear } from "@/lib/year-filter";

function defaultProfileId(
  profiles: Array<{ id: string; bankName: string }>
) {
  return (
    profiles.find((profile) => isBankEnabled(profile.bankName))?.id ??
    profiles[0]?.id ??
    ""
  );
}

export default async function ImportPage() {
  const user = await requireUser();
  await ensureBankProfilesForUser(user.id);

  const [bankProfiles, importBatches, cards] = await Promise.all([
    db.bankProfile.findMany({
      where: { userId: user.id },
      orderBy: [{ bankName: "asc" }, { statementType: "asc" }],
    }),
    db.importBatch.findMany({
      where: { userId: user.id },
      orderBy: { importedAt: "desc" },
      include: {
        bankProfile: { select: { name: true } },
        card: { select: { name: true } },
      },
    }),
    db.card.findMany({
      where: { userId: user.id },
      orderBy: { name: "asc" },
      include: {
        _count: { select: { transactions: true } },
      },
    }),
  ]);

  const cardRanges = await Promise.all(
    cards.map(async (card) => {
      const [minDate, maxDate] = await Promise.all([
        db.transaction.findFirst({
          where: { userId: user.id, cardId: card.id },
          orderBy: { date: "asc" },
          select: { date: true },
        }),
        db.transaction.findFirst({
          where: { userId: user.id, cardId: card.id },
          orderBy: { date: "desc" },
          select: { date: true },
        }),
      ]);

      return {
        id: card.id,
        dateFrom: minDate?.date.toISOString() ?? null,
        dateTo: maxDate?.date.toISOString() ?? null,
      };
    })
  );

  const rangeByCardId = new Map(
    cardRanges.map((range) => [range.id, range] as const)
  );

  const presetNotes = Object.fromEntries(
    BANK_PRESETS.map((preset) => [preset.key, preset.notes])
  );

  const managedCards = cards.map((card) => {
    const range = rangeByCardId.get(card.id);

    return {
      id: card.id,
      name: card.name,
      transactionCount: card._count.transactions,
      dateFrom: range?.dateFrom ?? null,
      dateTo: range?.dateTo ?? null,
    };
  });

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-title">Import</h1>
          <p className="page-subtitle">
            Manage cards, pick a bank profile, then upload your CSV. Re-importing
            the same card+file skips duplicates automatically.
          </p>
        </div>
      </div>

      <CardManager cards={managedCards} />

      {bankProfiles.length === 0 ? (
        <p className="text-sm text-secondary">
          No bank profiles found. Run{" "}
          <code className="inline-code">npm run db:seed</code>.
        </p>
      ) : (
        <ImportForm
          defaultProfileId={defaultProfileId(bankProfiles)}
          cards={managedCards.map((card) => ({
            id: card.id,
            name: card.name,
          }))}
          bankProfiles={bankProfiles.map((profile) => ({
            id: profile.id,
            presetKey: profile.id.replace(`${user.id}-`, ""),
            name: profile.name,
            bankName: profile.bankName,
            statementType: profile.statementType,
            enabled: isBankEnabled(profile.bankName),
            notes: presetNotes[profile.id.replace(`${user.id}-`, "")] ?? null,
            dateColumn: profile.dateColumn,
            amountColumn: profile.amountColumn,
            descriptionColumn: profile.descriptionColumn,
          }))}
        />
      )}

      <section className="panel panel-padded">
        <h2 className="section-title">Sample files</h2>
        <ul className="space-y-2 text-sm text-secondary">
          <li>
            <span className="font-medium text-primary">Capital One</span>
            <ul className="mt-1 space-y-1 pl-4">
              <li>
                Checking:{" "}
                <code className="inline-code">
                  Capital_One_Checking_transactions_download.csv
                </code>
              </li>
              <li>
                Credit card:{" "}
                <code className="inline-code">
                  Capital_One_Credit_transaction_download.csv
                </code>
              </li>
            </ul>
          </li>
          <li>
            <span className="font-medium text-primary">Chase</span>
            <ul className="mt-1 space-y-1 pl-4">
              <li>
                Checking:{" "}
                <code className="inline-code">
                  Chase_Checking_Activity_20260607.CSV
                </code>
              </li>
              <li>
                Credit card:{" "}
                <code className="inline-code">
                  Chase_Credit_Activity20260101_20260607_20260607.CSV
                </code>
              </li>
              <li>
                Credit card (with Card column):{" "}
                <code className="inline-code">
                  Chase_Credit_Business_Activity20240607_20260607_20260607.CSV
                </code>
              </li>
            </ul>
          </li>
          <li>
            <span className="font-medium text-primary">Bank of America</span>
            <ul className="mt-1 space-y-1 pl-4">
              <li>
                Checking:{" "}
                <code className="inline-code">Boa_Checking.csv</code>
              </li>
              <li>
                Credit card:{" "}
                <code className="inline-code">
                  BoA_Credit_May2026_8030.csv
                </code>
              </li>
            </ul>
          </li>
          <li>
            <span className="font-medium text-primary">Wise</span>
            <ul className="mt-1 space-y-1 pl-4">
              <li>
                Transaction history:{" "}
                <code className="inline-code">
                  Wise - transaction-history.csv
                </code>
              </li>
            </ul>
          </li>
          <li>
            <span className="font-medium text-primary">PayPal</span>
            <ul className="mt-1 space-y-1 pl-4">
              <li>
                Balance activity:{" "}
                <code className="inline-code">
                  Paypal_Balance_Effected_Transaction_Jan_May.CSV
                </code>
              </li>
            </ul>
          </li>
        </ul>
      </section>

      <ImportHistory
        coverageYear={getCurrentYear()}
        imports={importBatches.map((batch) => ({
          id: batch.id,
          filename: batch.filename,
          bankProfileName: batch.bankProfile.name,
          cardName: batch.card?.name ?? null,
          rowCount: batch.rowCount,
          skippedCount: batch.skippedCount,
          dateFrom: batch.dateFrom?.toISOString() ?? null,
          dateTo: batch.dateTo?.toISOString() ?? null,
          importedAt: batch.importedAt.toISOString(),
        }))}
      />
    </div>
  );
}
