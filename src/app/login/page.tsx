import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { signIn } from "@/lib/auth/auth";

async function usernameLogin(formData: FormData) {
  "use server";
  const username = formData.get("username") as string;

  try {
    await signIn("username-login", { username, redirectTo: "/" });
  } catch (error) {
    if (error instanceof AuthError && error.type === "CredentialsSignin") {
      redirect("/login?error=1");
    }
    throw error;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

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
              autoComplete="off"
              className="input"
              required
            />
          </div>
          {error ? (
            <p className="message-error text-sm">Sign in failed. Check your username.</p>
          ) : null}
          <button type="submit" className="btn-primary w-full">
            Sign in
          </button>
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
