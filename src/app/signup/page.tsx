import Link from "next/link";
import { db } from "@/lib/db";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  const invite = token
    ? await db.invite.findFirst({
        where: {
          token,
          usedAt: null,
          expiresAt: { gt: new Date() },
        },
      })
    : null;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="panel p-6">
        <h1 className="page-title">Sign up</h1>

        {!token ? (
          <p className="mt-4 text-sm text-secondary">
            Sign up is invite-only. Ask an existing user for an invite link.
          </p>
        ) : !invite ? (
          <p className="mt-4 message-error">This invite link is invalid or expired.</p>
        ) : (
          <div className="mt-4 space-y-3 text-sm text-secondary">
            <p>Valid invite found.</p>
            <p>
              In production, you would enter your email here and receive a magic
              link. For local development, log in as an existing user from Settings
              after signing in.
            </p>
            {invite.email ? (
              <p>
                Invited email: <strong className="text-primary">{invite.email}</strong>
              </p>
            ) : null}
          </div>
        )}

        <p className="mt-6 text-center text-sm text-secondary">
          Already have access?{" "}
          <Link href="/login" className="link-accent">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
