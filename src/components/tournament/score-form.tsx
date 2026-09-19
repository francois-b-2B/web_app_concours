"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

function SubmitButton({ dirty, hasSavedScore }: { dirty: boolean; hasSavedScore: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="secondary" disabled={!dirty || pending} className="mt-1">
      {pending ? "Enregistrement…" : hasSavedScore ? "Modifier" : "Enregistrer"}
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
}: {
  action: (formData: FormData) => void | Promise<void>;
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
  const [scoreA, setScoreA] = useState(initialA);
  const [scoreB, setScoreB] = useState(initialB);

  const dirty = scoreA !== initialA || scoreB !== initialB;
  const hasSavedScore = initialScoreA !== null && initialScoreB !== null;

  return (
    <form action={action} className="flex flex-col gap-3">
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
          value={scoreA}
          onChange={(e) => setScoreA(e.target.value)}
          disabled={disabled}
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
          value={scoreB}
          onChange={(e) => setScoreB(e.target.value)}
          disabled={disabled}
          className="w-20 text-center"
        />
      </div>
      {note && <p className="text-[13px] text-danger">{note}</p>}
      <SubmitButton dirty={dirty} hasSavedScore={hasSavedScore} />
    </form>
  );
}
