import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import { createInvite } from "@/app/actions/import";
import { formatDate } from "@/lib/format";
import { ensureBankProfilesForUser } from "@/lib/banks/ensure-profiles";
import { BANK_PRESETS, isBankEnabled, statementTypeLabel } from "@/lib/banks/presets";
import { ClassificationRulesForm } from "@/components/classification-rules-form";

export default async function SettingsPage() {
  const user = await requireUser();
  await ensureBankProfilesForUser(user.id);

  const [rules, profiles, accounts, invites] = await Promise.all([
    db.classificationRule.findMany({
      where: { userId: user.id },
      orderBy: { priority: "desc" },
    }),
    db.bankProfile.findMany({
      where: { userId: user.id },
      orderBy: [{ bankName: "asc" }, { statementType: "asc" }],
    }),
    db.bankAccount.findMany({
      where: { userId: user.id },
      orderBy: [{ bankName: "asc" }, { statementType: "asc" }],
    }),
    db.invite.findMany({
      where: { createdByUserId: user.id },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const presetNotes = Object.fromEntries(
    BANK_PRESETS.map((preset) => [preset.key, preset.notes])
  );

  return (
    <div className="page-stack">
      <div className="page-header">
        <div>
          <h1 className="page-title">Settings</h1>
          <p className="page-subtitle">
            Bank profiles, classification rules, and invite links.
          </p>
        </div>
      </div>

      <section className="panel panel-padded">
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="section-title !mb-0">Invite links</h2>
          <form action={createInvite}>
            <button type="submit" className="btn-primary">
              Generate invite
            </button>
          </form>
        </div>
        <ul className="space-y-2 text-sm">
          {invites.length === 0 ? (
            <li className="text-muted">No invites yet.</li>
          ) : (
            invites.map((invite) => (
              <li
                key={invite.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 py-2"
              >
                <code className="inline-code">
                  /signup?token={invite.token}
                </code>
                <span className="text-muted">
                  {invite.usedAt
                    ? "Used"
                    : `Expires ${formatDate(invite.expiresAt)}`}
                </span>
              </li>
            ))
          )}
        </ul>
      </section>

      <section className="panel panel-padded">
        <h2 className="section-title">Classification rules</h2>
        <ClassificationRulesForm rules={rules} />
      </section>

      <section className="panel panel-padded">
        <h2 className="section-title">Bank profiles</h2>
        <ul className="space-y-4 text-sm">
          {profiles.map((profile) => {
            const presetKey = profile.id.replace(`${user.id}-`, "");
            const enabled = isBankEnabled(profile.bankName);
            return (
              <li
                key={profile.id}
                className={`border-b border-white/5 pb-3 ${enabled ? "" : "opacity-45"}`}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`font-medium ${enabled ? "text-primary" : "text-muted"}`}>
                    {profile.name}
                  </span>
                  <span className="chip !py-0.5 text-xs">
                    {statementTypeLabel(profile.statementType)}
                  </span>
                  {!enabled ? (
                    <span className="chip !py-0.5 text-xs text-muted">Coming soon</span>
                  ) : null}
                </div>
                <div className="mt-1 text-secondary">
                  Date: <span className="text-white">{profile.dateColumn}</span> ·
                  Description:{" "}
                  <span className="text-white">{profile.descriptionColumn}</span>
                  {profile.debitColumn && profile.creditColumn ? (
                    <>
                      {" "}
                      · Debit/Credit:{" "}
                      <span className="text-white">
                        {profile.debitColumn}/{profile.creditColumn}
                      </span>
                    </>
                  ) : (
                    <>
                      {" "}
                      · Amount:{" "}
                      <span className="text-white">{profile.amountColumn}</span>
                    </>
                  )}
                </div>
                {presetNotes[presetKey] ? (
                  <p className="mt-1 text-xs text-muted">{presetNotes[presetKey]}</p>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="panel panel-padded">
        <h2 className="section-title">Bank accounts</h2>
        <ul className="space-y-2 text-sm">
          {accounts.map((account) => {
            const enabled = isBankEnabled(account.bankName ?? "");
            return (
              <li
                key={account.id}
                className={`border-b border-white/5 py-2 ${enabled ? "" : "opacity-45"}`}
              >
                <span className={enabled ? "text-primary" : "text-muted"}>
                  {account.name}
                </span>
                <span className="text-muted">
                  {" "}
                  · {statementTypeLabel(account.statementType)}
                  {!enabled ? " · Coming soon" : ""}
                </span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
