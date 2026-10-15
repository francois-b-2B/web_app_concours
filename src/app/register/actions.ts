"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validation/auth";
import { signIn } from "@/auth";
import type { AuthActionState } from "@/app/login/actions";

export async function registerAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = registerSchema.safeParse({
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { username, email, password } = parsed.data;

  const existingUsername = await prisma.user.findUnique({ where: { username } });
  if (existingUsername) {
    return { error: "Cet identifiant est déjà utilisé." };
  }

  if (email) {
    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return { error: "Un compte existe déjà avec cette adresse e-mail." };
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { name: username, username, email, hashedPassword } });

  try {
    await signIn("credentials", { identifier: username, password, redirectTo: "/dashboard" });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Compte créé, mais la connexion automatique a échoué. Connecte-toi." };
    }
    throw error;
  }
}
