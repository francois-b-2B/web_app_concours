"use client";

import { useActionState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { AddTeamState } from "./actions";

export function AddTeamForm({
  action,
}: {
  action: (prevState: AddTeamState, formData: FormData) => Promise<AddTeamState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) formRef.current?.reset();
  }, [pending, state.error]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col sm:flex-row gap-3 items-start">
      <Input name="player1" placeholder="Joueur 1" required className="sm:flex-1" />
      <Input name="player2" placeholder="Joueur 2" required className="sm:flex-1" />
      <Input name="contact" placeholder="Contact (optionnel)" className="sm:flex-1" />
      <Button type="submit" disabled={pending} className="whitespace-nowrap">
        {pending ? "Ajout…" : "Ajouter"}
      </Button>
      {state.error && <p className="text-[14px] text-danger sm:basis-full">{state.error}</p>}
    </form>
  );
}
