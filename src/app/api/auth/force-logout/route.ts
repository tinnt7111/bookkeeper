import { signOut } from "@/lib/auth/auth";

export async function GET() {
  return signOut({ redirectTo: "/login" });
}
