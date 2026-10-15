"use server";

import { AuthError } from "next-auth";
import { signIn } from "@/auth";

export interface AuthActionState {
  error?: string;
}

export async function loginAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  try {
    await signIn("credentials", {
      identifier: formData.get("identifier"),
      password: formData.get("password"),
      redirectTo: "/dashboard",
    });
    return {};
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Identifiant ou mot de passe incorrect." };
    }
    throw error;
  }
}

export async function googleSignInAction() {
  await signIn("google", { redirectTo: "/dashboard" });
}
