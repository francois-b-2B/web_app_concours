"use client";

import { useActionState, useRef, useEffect } from "react";
import { Input, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { AddTeamState } from "./actions";

export function AddTeamForm({
  action,
}: {
  action: (prevState: AddTeamState, formData: FormData) => Promise<AddTeamState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const player1Ref = useRef<HTMLInputElement>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (pending) submittedRef.current = true;
    if (!pending && !state.error && submittedRef.current) {
      formRef.current?.reset();
      player1Ref.current?.focus();
      submittedRef.current = false;
    }
  }, [pending, state.error]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col sm:flex-row gap-3 items-start">
      <Input ref={player1Ref} name="player1" placeholder="Joueur 1" required className="sm:flex-1" />
      <Input name="player2" placeholder="Joueur 2" required className="sm:flex-1" />
      <Select name="paymentStatus" defaultValue="PENDING" className="sm:w-40">
        <option value="PENDING">En attente</option>
        <option value="PAID">Réglée</option>
      </Select>
      <Input name="contact" placeholder="Contact (optionnel)" className="sm:flex-1" />
      <Button type="submit" disabled={pending} className="whitespace-nowrap">
        {pending ? "Ajout…" : "Ajouter"}
      </Button>
      {state.error && <p className="text-[14px] text-danger sm:basis-full">{state.error}</p>}
    </form>
  );
}
