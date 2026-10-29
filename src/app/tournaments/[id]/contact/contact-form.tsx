"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/input";
import type { ContactState } from "./actions";

const subjects = [
  "Suggestion d’amélioration",
  "Donner votre avis",
  "Signaler un problème",
  "Question sur l’utilisation",
  "Autre demande",
] as const;

export function ContactForm({
  action,
}: {
  action: (previousState: ContactState, formData: FormData) => Promise<ContactState>;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);
  const submittedRef = useRef(false);

  useEffect(() => {
    if (pending) submittedRef.current = true;
    if (!pending && state.success && submittedRef.current) {
      formRef.current?.reset();
      submittedRef.current = false;
    }
  }, [pending, state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-6">
      <p className="text-[14px] text-muted">
        Votre identité est associée automatiquement à votre compte et n’est pas affichée dans ce formulaire.
      </p>

      <fieldset className="flex flex-col gap-3">
        <legend className="text-[14px] font-medium text-muted mb-2">Motif</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {subjects.map((subject) => (
            <label
              key={subject}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-4 py-3 cursor-pointer hover:border-accent/60 transition-colors"
            >
              <input
                type="checkbox"
                name="subjects"
                value={subject}
                className="size-5 accent-[var(--accent)]"
              />
              <span className="text-[15px]">{subject}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-col gap-2">
        <Label htmlFor="contact-message">Message</Label>
        <textarea
          id="contact-message"
          name="message"
          required
          rows={6}
          placeholder="Expliquez-nous votre demande…"
          className="w-full resize-y rounded-xl bg-surface-2 border border-border px-4 py-3 text-[16px] text-foreground placeholder:text-muted outline-none focus:border-accent transition-colors"
        />
      </div>

      {state.error && <p className="text-[14px] text-danger" role="alert">{state.error}</p>}
      {state.success && (
        <p className="text-[14px] text-success" role="status">
          {state.warning ?? "Merci, votre message a bien été enregistré et envoyé par e-mail."}
        </p>
      )}

      <Button type="submit" disabled={pending} className="self-start">
        {pending ? "Envoi…" : "Envoyer"}
      </Button>
    </form>
  );
}
