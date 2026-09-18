import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

/**
 * Config "compatible edge" utilisée par le middleware : pas d'adapter Prisma
 * ni de bcrypt ici (non supportés en edge runtime). La vraie logique de
 * connexion (authorize) vit dans src/auth.ts, chargé uniquement côté Node.
 */
export default {
  pages: { signIn: "/login" },
  providers: [
    Google,
    Credentials({
      credentials: { email: {}, password: {} },
      authorize: async () => null,
    }),
  ],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const protectedPrefixes = ["/dashboard", "/tournaments"];
      const isProtected = protectedPrefixes.some((p) =>
        request.nextUrl.pathname.startsWith(p)
      );
      return !isProtected || isLoggedIn;
    },
    session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
} satisfies NextAuthConfig;
