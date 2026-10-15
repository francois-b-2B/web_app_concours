"use client";

import { useEffect, useRef, useState } from "react";

const BACKGROUND_URL = "/images/affiche-belote-vierge-v2.png";
const POSTER_WIDTH = 4420;
const POSTER_HEIGHT = 6250;

function frenchDate(value: string) {
  if (!value) return "DATE À PRÉCISER";
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .format(new Date(`${value}T12:00:00`))
    .toLocaleUpperCase("fr-FR");
}

function timeLabel(value: string) {
  return value.replace(":", "h");
}

function Field({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "time" | "number";
}) {
  return (
    <label className="flex flex-col gap-2 text-[14px] font-medium">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="min-h-11 rounded-xl border border-border bg-surface-2 px-4 text-foreground outline-none transition-colors focus:border-accent"
      />
    </label>
  );
}

export function PosterEditor() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [organizer, setOrganizer] = useState("ORGANISÉ PAR L’ASSOCIATION U SANTISSIMU RUSARIU");
  const [title, setTitle] = useState("CONCOURS DE BELOTE CONTRÉE");
  const [place, setPlace] = useState("PERO-CASEVECCHIE");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("17:00");
  const [address, setAddress] = useState("Casa cumuna");
  const [stake, setStake] = useState("20");
  const [percentage, setPercentage] = useState("70");
  const [footer, setFooter] = useState("Ci serà da beie è da manghjà");
  const [exporting, setExporting] = useState<"png" | "pdf" | null>(null);

  useEffect(() => {
    const today = new Date();
    const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 10);
    // The browser timezone is required here; it is unavailable during server rendering.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDate(localToday);
  }, []);

  const titleLength = Math.min(890, Math.max(540, title.length * 29));

  async function renderPosterCanvas() {
    if (!svgRef.current) return null;
    const canvas = document.createElement("canvas");
    canvas.width = POSTER_WIDTH;
    canvas.height = POSTER_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) return null;

    const background = new Image();
    background.src = BACKGROUND_URL;
    await background.decode();
    context.drawImage(background, 0, 0, POSTER_WIDTH, POSTER_HEIGHT);

    const overlay = svgRef.current.cloneNode(true) as SVGSVGElement;
    overlay.querySelector("image")?.remove();
    overlay.setAttribute("width", String(POSTER_WIDTH));
    overlay.setAttribute("height", String(POSTER_HEIGHT));
    const markup = new XMLSerializer().serializeToString(overlay);
    const blob = new Blob([markup], { type: "image/svg+xml;charset=utf-8" });
    const overlayUrl = URL.createObjectURL(blob);
    const overlayImage = new Image();
    overlayImage.src = overlayUrl;
    await overlayImage.decode();
    context.drawImage(overlayImage, 0, 0, POSTER_WIDTH, POSTER_HEIGHT);
    URL.revokeObjectURL(overlayUrl);
    return canvas;
  }

  async function downloadPng() {
    if (exporting) return;
    setExporting("png");
    try {
      const canvas = await renderPosterCanvas();
      if (!canvas) return;
      const output = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!output) return;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(output);
      link.download = "affiche-concours-belote.png";
      link.click();
      URL.revokeObjectURL(link.href);
    } finally {
      setExporting(null);
    }
  }

  async function downloadPdf() {
    if (exporting) return;
    setExporting("pdf");
    try {
      const canvas = await renderPosterCanvas();
      if (!canvas) return;
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.96), "JPEG", 0, 0, 210, 297);
      pdf.save("affiche-concours-belote.pdf");
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="poster-editor-shell grid grid-cols-1 gap-8 lg:grid-cols-[minmax(300px,380px)_1fr] lg:items-start">
      <section className="flex flex-col gap-5 rounded-card border border-border bg-surface p-6">
        <h2 className="text-xl font-semibold">Informations</h2>
        <Field label="Organisateur" value={organizer} onChange={setOrganizer} />
        <Field label="Titre" value={title} onChange={setTitle} />
        <Field label="Lieu" value={place} onChange={setPlace} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Field label="Date" type="date" value={date} onChange={setDate} />
          <Field label="Heure" type="time" value={time} onChange={setTime} />
        </div>
        <Field label="Adresse" value={address} onChange={setAddress} />
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mise par équipe (€)" type="number" value={stake} onChange={setStake} />
          <Field label="Mises reversées (%)" type="number" value={percentage} onChange={setPercentage} />
        </div>
        <Field label="Texte inférieur" value={footer} onChange={setFooter} />

        <div className="mt-2 flex flex-col gap-3 sm:flex-row lg:flex-col xl:flex-row">
          <button
            type="button"
            onClick={downloadPng}
            disabled={exporting !== null}
            className="min-h-11 flex-1 rounded-full bg-accent px-5 font-semibold text-white transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {exporting === "png" ? "Préparation…" : "Télécharger en PNG"}
          </button>
          <button
            type="button"
            onClick={downloadPdf}
            disabled={exporting !== null}
            className="min-h-11 flex-1 rounded-full border border-accent px-5 font-semibold text-accent transition-colors hover:bg-accent/10"
          >
            {exporting === "pdf" ? "Préparation…" : "Télécharger en PDF"}
          </button>
        </div>
      </section>

      <section className="poster-print-area mx-auto w-full max-w-[620px] overflow-hidden rounded-[18px] border border-border bg-surface shadow-2xl">
        <svg
          ref={svgRef}
          viewBox="0 0 1000 1414"
          role="img"
          aria-label="Aperçu de l’affiche du concours"
          className="block h-auto w-full"
          xmlns="http://www.w3.org/2000/svg"
        >
          <image href={BACKGROUND_URL} width="1000" height="1414" preserveAspectRatio="none" />
          <defs>
            <path id="poster-title-curve" d="M 54 365 Q 500 95 946 365" fill="none" />
          </defs>

          <text x="500" y="82" textAnchor="middle" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="21" letterSpacing="1.2">
            {organizer.toLocaleUpperCase("fr-FR")}
          </text>
          <text fill="#efad4c" fontFamily="Arial Black, Arial, sans-serif" fontWeight="900" fontSize="59" letterSpacing="-1">
            <textPath href="#poster-title-curve" startOffset="50%" textAnchor="middle" textLength={titleLength} lengthAdjust="spacingAndGlyphs">
              {title.toLocaleUpperCase("fr-FR")}
            </textPath>
          </text>
          <text x="500" y="400" textAnchor="middle" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="51" fontWeight="800" fontStyle="italic" letterSpacing="1">
            {place.toLocaleUpperCase("fr-FR")}
          </text>
          <text x="500" y="488" textAnchor="middle" dominantBaseline="central" fill="#e60000" fontFamily="Arial Black, Arial, sans-serif" fontSize="37" fontWeight="900">
            {frenchDate(date)}
          </text>
          <text x="500" y="588" textAnchor="middle" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="31" fontWeight="700">
            à partir de {timeLabel(time)} - {address}
          </text>
          <text x="758" y="1094" textAnchor="middle" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="67" fontWeight="800">
            {stake}€
          </text>
          <text x="758" y="1225" textAnchor="middle" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="700">
            {percentage} % des mises reversées
          </text>
          <rect x="222" y="1310" width="556" height="52" rx="26" fill="#ce160c" />
          <text x="500" y="1346" textAnchor="middle" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="28" fontWeight="700" letterSpacing="4">
            {footer}
          </text>
        </svg>
      </section>
    </div>
  );
}
