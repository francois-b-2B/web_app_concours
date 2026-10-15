"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export function ConfirmDialog({
  open,
  title,
  message,
  onCancel,
  onConfirm,
  confirmLabel = "OK",
}: {
  open: boolean;
  title?: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-label={title ?? "Confirmation"} className="w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-2xl">
        {title && <h2 className="text-lg font-semibold">{title}</h2>}
        <p className={title ? "mt-4 whitespace-pre-line text-[15px] leading-relaxed text-muted" : "whitespace-pre-line text-[15px] leading-relaxed text-muted"}>{message}</p>
        <div className="mt-6 flex justify-end gap-3">
          <Button autoFocus type="button" variant="secondary" onClick={onCancel}>Annuler</Button>
          <Button type="button" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}
