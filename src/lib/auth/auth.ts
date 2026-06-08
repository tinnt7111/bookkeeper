import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth/auth.config";
import { getBackdoorUsername } from "@/lib/auth/backdoor";
import { db } from "@/lib/db";

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
        const username = (credentials?.username as string | undefined)
          ?.trim()
          .toLowerCase();
        const backdoorUsername = getBackdoorUsername();

        if (!username || !backdoorUsername || username !== backdoorUsername) {
          return null;
        }

        const user = await db.user.findFirst({
          where: { name: backdoorUsername },
        });
        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? backdoorUsername,
        };
      },
    }),
  ],
});
