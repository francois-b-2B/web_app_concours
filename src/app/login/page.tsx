"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/card";
import { Input, Label } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { loginAction, googleSignInAction } from "./actions";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, {});

  return (
    <main className="flex-1 flex items-center justify-center px-6 py-20">
      <Card className="w-full max-w-sm flex flex-col gap-6">
        <div className="flex flex-col gap-1 text-center">
          <h1 className="text-2xl font-semibold">Se connecter</h1>
          <p className="text-[15px] text-muted">Accède à tes concours.</p>
        </div>

        <form action={googleSignInAction}>
          <Button type="submit" variant="secondary" className="w-full" disabled={pending}>
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
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="password">Mot de passe</Label>
            <Input
              id="password"
              name="password"
              type="password"
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
