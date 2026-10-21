"use client";

import { useActionState, useState } from "react";
import type { AurardRoundsState } from "./actions";

export function AurardRoundsForm({
  action,
  rounds,
  disabled = false,
}: {
  action: (formData: FormData) => Promise<AurardRoundsState>;
  rounds: number | null;
  disabled?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(rounds === null);
  const [selectedRounds, setSelectedRounds] = useState(String(rounds ?? 2));
  const [state, formAction, pending] = useActionState(
    async (_previous: AurardRoundsState, formData: FormData) => {
      const result = await action(formData);
      if (result.success && result.rounds) {
        setSelectedRounds(String(result.rounds));
        setIsEditing(false);
      }
      return result;
    },
    {},
  );

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <label className="flex flex-1 flex-col gap-2 text-[14px] font-medium">
        <select
          name="aurardRounds"
          aria-label="Nombre de parties"
          value={selectedRounds}
          onChange={(event) => {
            setSelectedRounds(event.target.value);
          }}
          disabled={disabled || pending || !isEditing}
          className="rounded-pill border border-border bg-surface-2 px-4 py-3 text-foreground outline-none disabled:opacity-50"
        >
          <option value="2">2 parties</option>
          <option value="3">3 parties</option>
          <option value="4">4 parties</option>
        </select>
      </label>
      <button
        type={isEditing ? "submit" : "button"}
        disabled={disabled || pending}
        onClick={isEditing ? undefined : () => setIsEditing(true)}
        className={
          isEditing
            ? "rounded-pill bg-accent px-5 py-3 font-semibold text-white transition-colors hover:bg-accent/90 disabled:pointer-events-none disabled:opacity-40"
            : "rounded-pill border border-accent bg-transparent px-5 py-3 font-semibold text-accent transition-colors hover:bg-accent/10 disabled:pointer-events-none disabled:opacity-40"
        }
      >
        {pending ? "Enregistrement…" : isEditing ? "Enregistrer" : "Modifier"}
      </button>
      {state.error && <p className="text-[13px] text-danger sm:ml-2">{state.error}</p>}
    </form>
  );
}
