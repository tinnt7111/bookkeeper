import { auth } from "@/lib/auth/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";

export async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    redirect("/api/auth/force-logout");
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  };
}
