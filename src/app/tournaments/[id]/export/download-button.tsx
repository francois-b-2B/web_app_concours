"use client";

import { useState } from "react";

export function DownloadButton({ url }: { url: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(false);

  async function download() {
    setPending(true);
    setError(false);
    try {
      const response = await fetch(url, { credentials: "same-origin" });
      if (!response.ok) throw new Error("Export impossible");
      const blob = await response.blob();
      const disposition = response.headers.get("Content-Disposition") ?? "";
      const filename = disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? "concours-export";
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch {
      setError(true);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={download}
        disabled={pending}
        className="mt-auto inline-flex min-h-11 items-center justify-center rounded-full bg-accent px-5 py-2.5 font-semibold text-white transition-colors hover:bg-accent-hover active:bg-accent-active disabled:pointer-events-none disabled:opacity-50"
      >
        {pending ? "Préparation…" : "Télécharger"}
      </button>
      {error && <p className="text-center text-[13px] text-danger">Le téléchargement a échoué. Réessaie.</p>}
    </div>
  );
}
