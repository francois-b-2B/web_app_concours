"use client";

import { useActionState, useState } from "react";
import {
  aurardBracketOverview,
  type AurardQualifierCount,
} from "@/lib/tournament/bracket";
import type { AurardQualifierState } from "./actions";

export function AurardQualifiersForm({
  action,
  automaticCount,
  selectedCount,
  choiceRequired,
  options,
  teamCount,
  disabled = false,
}: {
  action: (formData: FormData) => Promise<AurardQualifierState>;
  automaticCount: AurardQualifierCount;
  selectedCount: AurardQualifierCount | null;
  choiceRequired: boolean;
  options: readonly AurardQualifierCount[];
  teamCount: number;
  disabled?: boolean;
}) {
  const [isEditing, setIsEditing] = useState(choiceRequired || selectedCount === null);
  const [selectedValue, setSelectedValue] = useState(String(selectedCount ?? automaticCount));
  const [state, formAction, pending] = useActionState(
    async (_previous: AurardQualifierState, formData: FormData) => {
      const result = await action(formData);
      if (result.success && result.qualifierCount) {
        setSelectedValue(String(result.qualifierCount));
        setIsEditing(false);
      }
      return result;
    },
    {},
  );
  const hasAvailableOptions = options.some((count) => count < teamCount);

  return (
    <div className="flex flex-col gap-3">
      {choiceRequired && (
        <p className="text-[14px] text-danger">
          Le précédent choix n’est plus possible après un retrait. Choisis à nouveau le tableau final.
        </p>
      )}
      <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-2 text-[14px] font-medium">
          Équipes qualifiées · Modifiable tant que les inscriptions sont ouvertes
          <select
            name="aurardQualifierCount"
            value={selectedValue}
            onChange={(event) => {
              setSelectedValue(event.target.value);
            }}
            disabled={disabled || pending || !isEditing}
            className="rounded-pill border border-border bg-surface-2 px-4 py-3 text-foreground outline-none disabled:opacity-50"
          >
            {options.map((count) => {
              return (
                <option key={count} value={count} disabled={count >= teamCount}>
                  {count} équipes · {aurardBracketOverview(count).firstRound}
                </option>
              );
            })}
          </select>
        </label>
        <button
          type={isEditing ? "submit" : "button"}
          disabled={disabled || pending || !hasAvailableOptions}
          onClick={isEditing ? undefined : () => setIsEditing(true)}
          className={
            isEditing
              ? "rounded-pill bg-accent px-5 py-3 font-semibold text-white transition-colors hover:bg-accent/90 disabled:pointer-events-none disabled:opacity-40"
              : "rounded-pill border border-accent bg-transparent px-5 py-3 font-semibold text-accent transition-colors hover:bg-accent/10 disabled:pointer-events-none disabled:opacity-40"
          }
        >
          {pending ? "Enregistrement…" : isEditing ? "Enregistrer" : "Modifier"}
        </button>
      </form>
      {state.error && <p className="text-[13px] text-danger">{state.error}</p>}
    </div>
  );
}
