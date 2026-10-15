"use client";

import { useRef, useState } from "react";
import type { AddTeamState } from "./actions";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function RemoveButton({ disabled, onClick }: { disabled?: boolean; onClick: () => void }) {
  const { pending } = useFormStatus();

  return (
    <Button type="button" variant="ghost" size="md" className="text-danger" disabled={pending || disabled} onClick={onClick}>
      {pending ? "Retrait…" : "Retirer"}
    </Button>
  );
}

export function RemoveTeamForm({
  teamName,
  action,
  disabled,
}: {
  teamName: string;
  action: () => Promise<AddTeamState>;
  disabled?: boolean;
}) {
  const [error, setError] = useState<string>();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);
  return (
    <form
      ref={formRef}
      action={async () => { const result = await action(); setError(result.error); }}
      onSubmit={(event) => {
        if (!confirmedRef.current) event.preventDefault();
        confirmedRef.current = false;
      }}
    >
      <RemoveButton disabled={disabled} onClick={() => setOpen(true)} />
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <ConfirmDialog
        open={open}
        message={`Retirer définitivement l’équipe « ${teamName} » ?\n\nCette action est irréversible.`}
        onCancel={() => setOpen(false)}
        onConfirm={() => { setOpen(false); confirmedRef.current = true; formRef.current?.requestSubmit(); }}
        confirmLabel="Retirer"
      />
    </form>
  );
}
