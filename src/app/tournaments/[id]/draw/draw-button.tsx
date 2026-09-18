"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { DrawState } from "./actions";

export function DrawButton({
  action,
}: {
  action: (prevState: DrawState, formData: FormData) => Promise<DrawState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col items-center gap-3">
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Tirage en cours…" : "Lancer le tirage"}
      </Button>
      {state.error && <p className="text-[14px] text-danger text-center max-w-sm">{state.error}</p>}
    </form>
  );
}
