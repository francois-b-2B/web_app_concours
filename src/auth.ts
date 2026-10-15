import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validation/auth";
import authConfig from "@/auth.config";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  providers: [
    Google,
    Credentials({
      credentials: { identifier: {}, password: {} },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { username: parsed.data.identifier },
        });
        const legacyUser =
          user ??
          (await prisma.user.findUnique({ where: { email: parsed.data.identifier } }));
        if (!legacyUser?.hashedPassword) return null;

        const valid = await bcrypt.compare(parsed.data.password, legacyUser.hashedPassword);
        if (!valid) return null;

        return legacyUser;
      },
    }),
  ],
});
