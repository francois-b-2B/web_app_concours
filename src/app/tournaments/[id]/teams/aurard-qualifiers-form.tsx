"use client";

import { useActionState } from "react";
import {
  aurardBracketOverview,
  type AurardQualifierCount,
} from "@/lib/tournament";
import type { AurardQualifierState } from "./actions";

export function AurardQualifiersForm({
  action,
  automaticCount,
  selectedCount,
  choiceRequired,
  options,
  disabled = false,
}: {
  action: (formData: FormData) => Promise<AurardQualifierState>;
  automaticCount: AurardQualifierCount;
  selectedCount: AurardQualifierCount | null;
  choiceRequired: boolean;
  options: AurardQualifierCount[];
  disabled?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    action as unknown as (prevState: AurardQualifierState, formData: FormData) => Promise<AurardQualifierState>,
    {},
  );
  const currentCount = selectedCount ?? automaticCount;
  const overview = aurardBracketOverview(currentCount);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[14px] text-muted">
        {selectedCount === null
          ? `Proposition automatique : ${automaticCount} équipes qualifiées.`
          : `Choix enregistré : ${selectedCount} équipes qualifiées.`}
      </p>
      {choiceRequired && (
        <p className="text-[14px] text-danger">
          Le précédent choix n’est plus possible après un retrait. Choisis à nouveau le tableau final.
        </p>
      )}
      <p className="text-[14px]">
        Le tableau commencera par les <strong>{overview.firstRound.toLowerCase()}</strong>. Ce choix reste modifiable tant que les inscriptions sont ouvertes.
      </p>
      <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-2 text-[14px] font-medium">
          Équipes qualifiées
          <select
            name="aurardQualifierCount"
            defaultValue={String(currentCount)}
            disabled={disabled || pending}
            className="rounded-pill border border-border bg-surface-2 px-4 py-3 text-foreground outline-none disabled:opacity-50"
          >
            {options.map((count) => {
              return (
                <option key={count} value={count}>
                  {count} équipes · {aurardBracketOverview(count).firstRound}
                </option>
              );
            })}
          </select>
        </label>
        <button
          type="submit"
          disabled={disabled || pending || options.length === 0}
          className="rounded-pill bg-accent px-5 py-3 font-semibold text-white transition-colors hover:bg-accent/90 disabled:pointer-events-none disabled:opacity-40"
        >
          {pending ? "Enregistrement…" : "Enregistrer"}
        </button>
      </form>
      {state.error && <p className="text-[13px] text-danger">{state.error}</p>}
      {state.success && <p className="text-[13px] text-success">Réglage enregistré.</p>}
    </div>
  );
}
