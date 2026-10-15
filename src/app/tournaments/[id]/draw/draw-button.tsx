"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { DrawState } from "./actions";

export function DrawButton({
  action,
  disabled = false,
  neutral = false,
  label = "Lancer le tirage",
}: {
  action: (prevState: DrawState, formData: FormData) => Promise<DrawState>;
  disabled?: boolean;
  neutral?: boolean;
  label?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col items-center gap-3">
      <Button
        type="submit"
        size="lg"
        variant={disabled || neutral ? "secondary" : "primary"}
        className={neutral ? "text-muted disabled:!opacity-100" : undefined}
        disabled={disabled || pending}
      >
        {pending ? "Tirage en cours…" : label}
      </Button>
      {state.error && <p className="text-[14px] text-danger text-center max-w-sm">{state.error}</p>}
    </form>
  );
}
