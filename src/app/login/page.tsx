import Link from "next/link";
import { signIn } from "@/lib/auth/auth";
import { DEFAULT_USERNAME } from "@/lib/auth/default-user";

async function usernameLogin(formData: FormData) {
  "use server";
  const username = formData.get("username") as string;
  await signIn("username-login", { username, redirectTo: "/" });
}

export default function LoginPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <div className="panel p-6">
        <h1 className="page-title">Bookkeeper</h1>
        <p className="page-subtitle">
          Sign in to manage business and personal transactions.
        </p>

        <form action={usernameLogin} className="mt-6 space-y-4">
          <div>
            <label htmlFor="username" className="mb-1 block text-sm text-secondary">
              Username
            </label>
            <input
              id="username"
              name="username"
              type="text"
              autoComplete="username"
              className="input"
              defaultValue={DEFAULT_USERNAME}
              required
            />
          </div>
          <button type="submit" className="btn-primary w-full">
            Sign in
          </button>
          <p className="text-xs text-muted">
            No password required. Enter your username to continue.
          </p>
        </form>

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
