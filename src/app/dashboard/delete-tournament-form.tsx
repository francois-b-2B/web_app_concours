"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

function DeleteButton({ onClick }: { onClick: () => void }) {
  const { pending } = useFormStatus();

  return (
    <Button type="button" variant="dangerOutline" className="w-full sm:w-auto" disabled={pending} onClick={onClick}>
      {pending ? "Suppression…" : "Supprimer"}
    </Button>
  );
}

export function DeleteTournamentForm({
  tournamentName,
  action,
}: {
  tournamentName: string;
  action: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const confirmedRef = useRef(false);

  return (
    <>
      <form ref={formRef} action={action} className="w-full sm:w-auto" onSubmit={(event) => {
        if (!confirmedRef.current) event.preventDefault();
        confirmedRef.current = false;
      }}>
        <DeleteButton onClick={() => setOpen(true)} />
      </form>
      <ConfirmDialog
        open={open}
        message={`Supprimer définitivement « ${tournamentName} » ?\n\nLes équipes, résultats et toutes les autres données de ce concours seront supprimés définitivement. Cette action est irréversible.`}
        onCancel={() => setOpen(false)}
        onConfirm={() => { setOpen(false); confirmedRef.current = true; formRef.current?.requestSubmit(); }}
        confirmLabel="Supprimer"
      />
    </>
  );
}
