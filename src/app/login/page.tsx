import Link from "next/link";
import { signIn } from "@/lib/auth/auth";

async function devLogin(formData: FormData) {
  "use server";
  const email = formData.get("email") as string;
  await signIn("dev-login", { email, redirectTo: "/" });
}

export default function LoginPage() {
  const isDev = process.env.NODE_ENV === "development";

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="panel p-6">
        <h1 className="page-title">Bookkeeper</h1>
        <p className="page-subtitle">
          Sign in to manage business and personal transactions.
        </p>

        {isDev ? (
          <form action={devLogin} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="mb-1 block text-sm text-secondary">
                Email
              </label>
              <select
                id="email"
                name="email"
                className="input"
                defaultValue="demo@local.dev"
              >
                <option value="demo@local.dev">demo@local.dev</option>
                <option value="family@local.dev">family@local.dev</option>
              </select>
            </div>
            <button type="submit" className="btn-primary w-full">
              Sign in (local dev)
            </button>
            <p className="text-xs text-muted">
              Local dev uses instant login. Production will use invite-only magic
              links.
            </p>
          </form>
        ) : (
          <p className="mt-6 text-sm text-secondary">
            Magic link login is enabled in production. Use your invite link to
            sign up first.
          </p>
        )}

        <p className="mt-6 text-center text-sm text-secondary">
          Have an invite?{" "}
          <Link href="/signup" className="link-accent">
            Sign up
          </Link>
        </p>
      </div>
    </main>
  );
}
