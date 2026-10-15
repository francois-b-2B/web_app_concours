"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { UpdateTeamState } from "./actions";

export function EditTeamForm({
  action,
  player1,
  player2,
  player3,
  triplettes = false,
  contact,
}: {
  action: (prevState: UpdateTeamState, formData: FormData) => Promise<UpdateTeamState>;
  player1: string;
  player2: string;
  player3: string | null;
  triplettes?: boolean;
  contact: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [state, formAction, pending] = useActionState(action, {});
  const submittedRef = useRef(false);
  const player1Ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (pending) submittedRef.current = true;
    if (!pending && state.success && submittedRef.current) {
      setEditing(false);
      submittedRef.current = false;
    }
  }, [pending, state.success]);

  useEffect(() => {
    if (editing) {
      const frame = requestAnimationFrame(() => {
        player1Ref.current?.focus();
        player1Ref.current?.select();
      });
      return () => cancelAnimationFrame(frame);
    }
  }, [editing]);

  if (!editing) {
    return (
      <Button type="button" variant="ghost" size="md" onClick={() => setEditing(true)}>
        Modifier
      </Button>
    );
  }

  return (
    <form action={formAction} className="basis-full flex flex-col sm:flex-row gap-3 pt-3">
      <Input
        ref={player1Ref}
        name="player1"
        defaultValue={player1}
        aria-label="Joueur 1"
        onFocus={(event) => event.currentTarget.select()}
        required
      />
      {triplettes && (
        <Input name="player3" defaultValue={player3 ?? ""} aria-label="Joueur 3" required />
      )}
      <Input
        name="player2"
        defaultValue={player2}
        aria-label="Joueur 2"
        onFocus={(event) => event.currentTarget.select()}
        required
      />
      <Input name="contact" defaultValue={contact ?? ""} placeholder="Contact (optionnel)" />
      <div className="flex gap-2">
        <Button type="submit" size="md" disabled={pending}>
          {pending ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button type="button" variant="secondary" size="md" onClick={() => setEditing(false)}>
          Annuler
        </Button>
      </div>
      {state.error && <p className="text-[14px] text-danger sm:basis-full">{state.error}</p>}
    </form>
  );
}
