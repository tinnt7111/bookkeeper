import { AppNav } from "@/components/app-nav";
import { requireUser } from "@/lib/auth/require-user";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();

  return (
    <>
      <AppNav userEmail={user.email} />
      <main className="app-shell py-6">{children}</main>
    </>
  );
}
