import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth/auth.config";
import { getBackdoorUsername, normalizeAuthValue } from "@/lib/auth/backdoor";
import { ensureBackdoorUser } from "@/lib/auth/ensure-backdoor-user";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  providers: [
    Credentials({
      id: "username-login",
      name: "Username",
      credentials: {
        username: { label: "Username", type: "text" },
      },
      async authorize(credentials) {
        const username = normalizeAuthValue(
          credentials?.username as string | undefined
        );
        const backdoorUsername = getBackdoorUsername();

        if (!username || !backdoorUsername || username !== backdoorUsername) {
          return null;
        }

        const user = await ensureBackdoorUser(backdoorUsername);

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? backdoorUsername,
        };
      },
    }),
  ],
});
