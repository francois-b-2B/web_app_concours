"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { MAX_SCORE, RESET_RESULTS_MESSAGE, type ScoreActionResult } from "@/lib/tournament/score-integrity";
import { cn } from "@/lib/cn";

function SaveButton({ dirty }: { dirty: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={!dirty || pending} className="mt-1">
      {pending ? "Enregistrement…" : "Enregistrer"}
    </Button>
  );
}

export function ScoreForm({
  action,
  teamALabel,
  teamBLabel,
  initialScoreA,
  initialScoreB,
  winnerSide,
  disabled,
  note,
  teamAId,
  teamBId,
}: {
  action: (formData: FormData) => void | ScoreActionResult | Promise<void | ScoreActionResult>;
  teamAId?: string | null;
  teamBId?: string | null;
  teamALabel: string;
  teamBLabel: string;
  initialScoreA: number | null;
  initialScoreB: number | null;
  winnerSide?: "A" | "B" | null;
  disabled?: boolean;
  note?: string;
}) {
  const initialA = initialScoreA?.toString() ?? "";
  const initialB = initialScoreB?.toString() ?? "";
  const hasSavedScore = initialScoreA !== null && initialScoreB !== null;

  const [locked, setLocked] = useState(hasSavedScore);
  const [scoreA, setScoreA] = useState(initialA);
  const [scoreB, setScoreB] = useState(initialB);

  const [error, setError] = useState<string>();
  const [pendingConfirmation, setPendingConfirmation] = useState<FormData | null>(null);

  async function submit(form: FormData) {
    setError(undefined);
    const result = await action(form);
    if (result?.confirmationRequired) {
      setPendingConfirmation(form);
      return;
    }
    if (result?.error) setError(result.error);
    else setLocked(scoreA !== "" && scoreB !== "");
  }

  async function confirmReset() {
    if (!pendingConfirmation) return;
    const form = pendingConfirmation;
    setPendingConfirmation(null);
    form.set("confirmReset", "yes");
    setError(undefined);
    const result = await action(form);
    if (result?.error) setError(result.error);
    else if (!result?.confirmationRequired) setLocked(scoreA !== "" && scoreB !== "");
  }

  const dirty = scoreA !== initialA || scoreB !== initialB;
  const fieldsDisabled = disabled || locked;

  return (
    <>
      <form action={submit} className="flex flex-col gap-3">
      {teamAId && <input type="hidden" name="expectedTeamAId" value={teamAId} />}
      {teamBId && <input type="hidden" name="expectedTeamBId" value={teamBId} />}
      <div className="flex items-center gap-3">
        <span
          className={cn("flex-1 text-[15px]", winnerSide === "A" ? "font-semibold" : "text-muted")}
        >
          {teamALabel}
        </span>
        <Input
          type="number"
          name="scoreA"
          min={0}
          max={MAX_SCORE}
          step={1}
          value={scoreA}
          onChange={(e) => setScoreA(e.target.value)}
          onWheel={(event) => event.currentTarget.blur()}
          disabled={fieldsDisabled}
          className="w-20 text-center"
        />
      </div>
      <div className="text-center text-[12px] font-semibold text-muted tracking-wide">CONTRE</div>
      <div className="flex items-center gap-3">
        <span
          className={cn("flex-1 text-[15px]", winnerSide === "B" ? "font-semibold" : "text-muted")}
        >
          {teamBLabel}
        </span>
        <Input
          type="number"
          name="scoreB"
          min={0}
          max={MAX_SCORE}
          step={1}
          value={scoreB}
          onChange={(e) => setScoreB(e.target.value)}
          onWheel={(event) => event.currentTarget.blur()}
          disabled={fieldsDisabled}
          className="w-20 text-center"
        />
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {note && <p className="text-[13px] text-danger">{note}</p>}

      {locked ? (
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => setLocked(false)}
          className="mt-1"
        >
          Modifier
        </Button>
      ) : (
        <SaveButton dirty={dirty && !disabled} />
      )}
      </form>
      <ConfirmDialog
        open={pendingConfirmation !== null}
        message={RESET_RESULTS_MESSAGE}
        onCancel={() => setPendingConfirmation(null)}
        onConfirm={confirmReset}
        confirmLabel="Continuer"
      />
    </>
  );
}
