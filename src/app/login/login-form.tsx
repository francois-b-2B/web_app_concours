"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { Button } from "@/components/ui/button";
import { loginAction, googleSignInAction } from "./actions";

const oauthErrorMessages: Record<string, string> = {
  OAuthAccountNotLinked:
    "Cette adresse e-mail est déjà associée à un compte avec identifiant et mot de passe. Connecte-toi avec cette méthode.",
  OAuthSignin: "La connexion avec Google n’a pas pu démarrer. Réessaie.",
  OAuthCallback: "Google n’a pas pu valider la connexion. Réessaie.",
  AccessDenied: "La connexion avec Google a été refusée.",
  Configuration: "La connexion avec Google n’est pas configurée pour cet environnement.",
};

type LoginFormProps = {
  oauthError?: string;
};

export default function LoginForm({ oauthError }: LoginFormProps) {
  const [state, formAction, pending] = useActionState(loginAction, {});
  const oauthMessage = oauthError
    ? oauthErrorMessages[oauthError] ?? "La connexion avec Google a échoué. Réessaie."
    : undefined;

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-20">
      <Card className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-2xl font-semibold">Se connecter</h1>
          <p className="text-[15px] text-muted">Accède à tes concours.</p>
        </div>

        {oauthMessage && (
          <p role="alert" className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-[14px] text-danger">
            {oauthMessage}
          </p>
        )}

        <form action={googleSignInAction}>
          <Button type="submit" className="w-full" disabled={pending}>
            Continuer avec Google
          </Button>
        </form>

        <div className="flex items-center gap-3 text-[13px] text-muted">
          <div className="h-px flex-1 bg-border" />
          ou
          <div className="h-px flex-1 bg-border" />
        </div>

        <form action={formAction} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="identifier">Identifiant</Label>
            <Input id="identifier" name="identifier" type="text" required autoComplete="username" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <PasswordInput
              id="password"
              name="password"
              required
              autoComplete="current-password"
            />
          </div>

          {state.error && <p className="text-[14px] text-danger">{state.error}</p>}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Connexion…" : "Se connecter"}
          </Button>
        </form>

        <p className="text-center text-[14px] text-muted">
          Pas encore de compte ?{" "}
          <Link href="/register" className="text-accent hover:text-accent-hover">
            Créer un compte
          </Link>
        </p>
      </Card>
    </main>
  );
}
