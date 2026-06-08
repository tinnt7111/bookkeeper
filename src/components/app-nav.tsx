import Link from "next/link";
import { signOut } from "@/lib/auth/auth";

const links = [
  { href: "/", label: "Dashboard" },
  { href: "/transactions", label: "Transactions" },
  { href: "/reports", label: "Reports" },
  { href: "/import", label: "Import" },
  { href: "/settings", label: "Settings" },
];

export function AppNav({
  userEmail,
}: {
  userEmail: string;
}) {
  return (
    <header className="border-b border-[var(--panel-border)] bg-[var(--panel-from)]">
      <div className="app-shell flex items-center justify-between gap-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold text-heading">
            Bookkeeper
          </Link>
          <nav className="flex flex-wrap gap-3">
            {links.map((link) => (
              <Link key={link.href} href={link.href} className="nav-link">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-sm text-secondary">
          <span>{userEmail}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/login" });
            }}
          >
            <button type="submit" className="btn-secondary">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
