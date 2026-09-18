"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import type { LaunchFinalsState } from "./actions";

export function LaunchFinalsButton({
  action,
}: {
  action: (prevState: LaunchFinalsState, formData: FormData) => Promise<LaunchFinalsState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="flex flex-col items-center gap-3">
      <Button type="submit" size="lg" disabled={pending}>
        {pending ? "Lancement…" : "Lancer la phase finale"}
      </Button>
      {state.error && <p className="text-[14px] text-danger text-center max-w-sm">{state.error}</p>}
    </form>
  );
}
