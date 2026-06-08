import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/lib/auth/auth.config";
import { db } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
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
        if (!username) return null;

        const user = await db.user.findFirst({
          where: {
            OR: [{ name: username }, { email: `${username}@local.dev` }],
          },
        });
        if (!user) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name ?? username,
        };
      },
    }),
  ],
});
