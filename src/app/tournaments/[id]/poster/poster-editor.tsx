"use client";

import NextImage from "next/image";
import type { PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef, useState } from "react";

const POSTER_WIDTH = 4420;
const POSTER_HEIGHT = 6250;
type PosterFormat = "BELOTE" | "BOULES";
type TeamComposition = "DOUBLETTES" | "TRIPLETTES";

const BOULES_BACKGROUNDS = [
  { id: "original", label: "Mur en pierre (fond actuel)", src: "/images/affiche-boules-fond-poster.png", previewSrc: "/images/affiche-boules-fond-vignette-sans-traits.png" },
  { id: "mer", label: "Boules au bord de la mer", src: "/images/affiche-boules-photo-mer.png", previewSrc: "/images/affiche-boules-photo-mer-preview.png" },
  { id: "lumieres", label: "Boules bleues et rouges", src: "/images/affiche-boules-photo-lumieres.png", previewSrc: "/images/affiche-boules-photo-lumieres-preview.png" },
] as const;
type BoulesBackgroundId = (typeof BOULES_BACKGROUNDS)[number]["id"];
type BoulesBackgroundSelection = BoulesBackgroundId | "custom";

const BOULES_VISUALS = [
  { id: "none", label: "Aucun visuel", src: null },
  { id: "luminous", label: "Boule lumineuse", src: "/images/chrome-luminous-ball.png" },
  { id: "chrome", label: "Boule chromée", src: "/images/futuristic-chrome-sphere.png" },
  { id: "duo", label: "Duo métallique et bois", src: "/images/boules-duo-metal-bois.png" },
] as const;
type BoulesVisualId = (typeof BOULES_VISUALS)[number]["id"];
type BoulesVisualInteraction = {
  pointerId: number;
  mode: "move" | "resize";
  pointerX: number;
  pointerY: number;
  x: number;
  y: number;
  size: number;
};

const BOULES_VISUAL_AREA = {
  left: 0,
  top: 652,
  right: 1000,
  bottom: 1210,
};
const BOULES_VISUAL_MIN_SIZE = 120;
// The default visual is 260 units; allow roughly twice that size when resizing.
const BOULES_VISUAL_MAX_SIZE = 560;

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

function drawImageCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  width: number,
  height: number,
) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.naturalWidth - sourceWidth) / 2;
  const sourceY = (image.naturalHeight - sourceHeight) / 2;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, width, height);
}

function drawImageContain(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  const scale = Math.min(width / image.naturalWidth, height / image.naturalHeight);
  const renderedWidth = image.naturalWidth * scale;
  const renderedHeight = image.naturalHeight * scale;
  context.drawImage(
    image,
    x + (width - renderedWidth) / 2,
    y + (height - renderedHeight) / 2,
    renderedWidth,
    renderedHeight,
  );
}

function PosterQrCode({ qrCode, x, y }: { qrCode: string; x: number; y: number }) {
  return (
    <g aria-label="Suivez les résultats en direct avec ce QR code">
      <rect x={x} y={y} width="190" height="220" rx="16" fill="#ffffff" />
      <text x={x + 95} y={y + 31} textAnchor="middle" fill="#050505" fontFamily="Arial Black, Arial, sans-serif" fontSize="12" fontWeight="900">
        SUIVEZ LES RÉSULTATS
      </text>
      <text x={x + 95} y={y + 48} textAnchor="middle" fill="#050505" fontFamily="Arial Black, Arial, sans-serif" fontSize="12" fontWeight="900">
        EN DIRECT
      </text>
      <image href={qrCode} x={x + 28} y={y + 65} width="135" height="135" preserveAspectRatio="xMidYMid meet" />
    </g>
  );
}

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

function shortFrenchDate(value: string) {
  if (!value) return "DATE À PRÉCISER";
  return new Intl.DateTimeFormat("fr-FR", {
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
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "time" | "number";
  multiline?: boolean;
}) {
  return (
    <label className="flex flex-col gap-2 text-[14px] font-medium">
      {label}
      {multiline ? (
        <textarea
          rows={3}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="min-h-11 resize-y rounded-xl border border-border bg-surface-2 px-4 py-3 text-foreground outline-none transition-colors focus:border-accent"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onWheel={(event) => {
            if (type === "number") {
              event.preventDefault();
              event.currentTarget.blur();
            }
          }}
          className="min-h-11 rounded-xl border border-border bg-surface-2 px-4 text-foreground outline-none transition-colors focus:border-accent"
        />
      )}
    </label>
  );
}

export function PosterEditor({
  format,
  teamComposition,
  qrCode,
}: {
  format: PosterFormat;
  teamComposition: TeamComposition;
  qrCode: string;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const isBoules = format === "BOULES";
  const [posterTeamComposition, setPosterTeamComposition] = useState<TeamComposition>(teamComposition);
  const [boulesBackground, setBoulesBackground] = useState<BoulesBackgroundSelection>("original");
  const [customBackgroundUrl, setCustomBackgroundUrl] = useState<string | null>(null);
  const [customBackgroundName, setCustomBackgroundName] = useState("");
  const [customBackgroundMessage, setCustomBackgroundMessage] = useState("");
  const [boulesVisual, setBoulesVisual] = useState<BoulesVisualId>("none");
  const [boulesVisualGeometry, setBoulesVisualGeometry] = useState({ x: 370, y: 845, size: 260 });
  const [boulesVisualSelected, setBoulesVisualSelected] = useState(false);
  const boulesVisualInteractionRef = useRef<BoulesVisualInteraction | null>(null);
  const teamLabel = posterTeamComposition === "TRIPLETTES" ? "TRIPLETTE" : "DOUBLETTE";
  const selectedBoulesBackground = BOULES_BACKGROUNDS.find((background) => background.id === boulesBackground) ?? BOULES_BACKGROUNDS[0];
  const backgroundUrl = isBoules
    ? boulesBackground === "custom" && customBackgroundUrl
      ? customBackgroundUrl
      : selectedBoulesBackground.src
    : "/images/affiche-belote-vierge-v2.png";
  const selectedBoulesVisual = BOULES_VISUALS.find((visual) => visual.id === boulesVisual) ?? BOULES_VISUALS[0];
  const { x: bouleVisualX, y: bouleVisualY, size: bouleVisualSize } = boulesVisualGeometry;
  const [organizer, setOrganizer] = useState("ORGANISÉ PAR L’ASSOCIATION U SANTISSIMU RUSARIU");
  const [title, setTitle] = useState(isBoules ? "CONCOURS DE BOULES" : "CONCOURS DE BELOTE CONTRÉE");
  const [boulesTitleLine1, setBoulesTitleLine1] = useState("CONCOURS");
  const [boulesTitleLine2, setBoulesTitleLine2] = useState("DE BOULES");
  const [place, setPlace] = useState("PERO-CASEVECCHIE");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("17:00");
  const [address, setAddress] = useState("Casa cumuna");
  const [stake, setStake] = useState("20");
  const [percentage, setPercentage] = useState("70");
  const [footer, setFooter] = useState("Ci serà da beie è da manghjà");
  const [bottomLeft, setBottomLeft] = useState("CI SERÀ DA BEIE\nÈ\nDA MANGHJÀ");
  const [bottomCenter, setBottomCenter] = useState("LES MISES SONT\nINTEGRALEMENT\nREVERSEES");
  const [bottomRight, setBottomRight] = useState("VENEZ NOMBREUX !");
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

  useEffect(() => {
    return () => {
      if (customBackgroundUrl) URL.revokeObjectURL(customBackgroundUrl);
    };
  }, [customBackgroundUrl]);

  const titleLength = Math.min(890, Math.max(540, title.length * 29));

  async function importCustomBackground(file: File | undefined) {
    if (!file) return;
    const acceptedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!acceptedTypes.includes(file.type)) {
      setCustomBackgroundMessage("Format non accepté. Utilisez une image JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      setCustomBackgroundMessage("Cette image dépasse la taille maximale de 15 Mo.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.src = objectUrl;
    try {
      await image.decode();
    } catch {
      URL.revokeObjectURL(objectUrl);
      setCustomBackgroundMessage("Cette image ne peut pas être lue.");
      return;
    }

    setCustomBackgroundUrl(objectUrl);
    setCustomBackgroundName(file.name);
    setBoulesBackground("custom");
    setCustomBackgroundMessage(
      image.naturalWidth < 1200 || image.naturalHeight < 1700
        ? "Image importée. Sa définition est assez faible pour une impression A3."
        : "Image importée. Elle sera recadrée automatiquement au format portrait.",
    );
  }

  function removeCustomBackground() {
    setBoulesBackground("original");
    setCustomBackgroundUrl(null);
    setCustomBackgroundName("");
    setCustomBackgroundMessage("");
  }

  function pointerCoordinates(event: ReactPointerEvent<SVGElement>) {
    const bounds = svgRef.current?.getBoundingClientRect();
    if (!bounds) return null;
    return {
      x: ((event.clientX - bounds.left) / bounds.width) * 1000,
      y: ((event.clientY - bounds.top) / bounds.height) * 1414,
    };
  }

  function startVisualInteraction(
    event: ReactPointerEvent<SVGElement>,
    mode: BoulesVisualInteraction["mode"],
  ) {
    const pointer = pointerCoordinates(event);
    if (!pointer) return;
    event.preventDefault();
    event.stopPropagation();
    svgRef.current?.setPointerCapture(event.pointerId);
    setBoulesVisualSelected(true);
    boulesVisualInteractionRef.current = {
      pointerId: event.pointerId,
      mode,
      pointerX: pointer.x,
      pointerY: pointer.y,
      ...boulesVisualGeometry,
    };
  }

  function moveVisual(event: ReactPointerEvent<SVGSVGElement>) {
    const interaction = boulesVisualInteractionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    const pointer = pointerCoordinates(event);
    if (!pointer) return;
    event.preventDefault();
    const deltaX = pointer.x - interaction.pointerX;
    const deltaY = pointer.y - interaction.pointerY;

    if (interaction.mode === "move") {
      setBoulesVisualGeometry({
        x: clamp(
          interaction.x + deltaX,
          BOULES_VISUAL_AREA.left,
          BOULES_VISUAL_AREA.right - interaction.size,
        ),
        y: clamp(
          interaction.y + deltaY,
          BOULES_VISUAL_AREA.top,
          BOULES_VISUAL_AREA.bottom - interaction.size,
        ),
        size: interaction.size,
      });
      return;
    }

    const availableSize = Math.min(
      BOULES_VISUAL_MAX_SIZE,
      BOULES_VISUAL_AREA.right - interaction.x,
      BOULES_VISUAL_AREA.bottom - interaction.y,
    );
    setBoulesVisualGeometry({
      x: interaction.x,
      y: interaction.y,
      size: clamp(interaction.size + Math.max(deltaX, deltaY), BOULES_VISUAL_MIN_SIZE, availableSize),
    });
  }

  function endVisualInteraction(event: ReactPointerEvent<SVGSVGElement>) {
    const interaction = boulesVisualInteractionRef.current;
    if (!interaction || interaction.pointerId !== event.pointerId) return;
    if (svgRef.current?.hasPointerCapture(event.pointerId)) {
      svgRef.current.releasePointerCapture(event.pointerId);
    }
    boulesVisualInteractionRef.current = null;
  }

  async function renderPosterCanvas() {
    if (!svgRef.current) return null;
    const canvas = document.createElement("canvas");
    canvas.width = POSTER_WIDTH;
    canvas.height = POSTER_HEIGHT;
    const context = canvas.getContext("2d");
    if (!context) return null;

    const background = new Image();
    background.src = backgroundUrl;
    await background.decode();
    if (boulesBackground === "custom") {
      drawImageCover(context, background, POSTER_WIDTH, POSTER_HEIGHT);
    } else {
      context.drawImage(background, 0, 0, POSTER_WIDTH, POSTER_HEIGHT);
    }

    if (isBoules && selectedBoulesVisual.src) {
      const visual = new Image();
      visual.src = selectedBoulesVisual.src;
      await visual.decode();
      const scaleX = POSTER_WIDTH / 1000;
      const scaleY = POSTER_HEIGHT / 1414;
      context.save();
      context.shadowColor = "rgba(0, 0, 0, 0.45)";
      context.shadowBlur = 18 * scaleX;
      context.shadowOffsetY = 10 * scaleY;
      drawImageContain(
        context,
        visual,
        bouleVisualX * scaleX,
        bouleVisualY * scaleY,
        bouleVisualSize * scaleX,
        bouleVisualSize * scaleY,
      );
      context.restore();
    }

    const overlay = svgRef.current.cloneNode(true) as SVGSVGElement;
    overlay.querySelector('[data-poster-background="true"]')?.remove();
    overlay.querySelector('[data-boule-editor="true"]')?.remove();
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
      link.download = `affiche-concours-${isBoules ? "boules" : "belote"}.png`;
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
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a3" });
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.96), "JPEG", 0, 0, 297, 420);
      pdf.save(`affiche-concours-${isBoules ? "boules" : "belote"}.pdf`);
    } finally {
      setExporting(null);
    }
  }

  return (
    <div className="poster-editor-shell grid grid-cols-1 gap-8 lg:grid-cols-[minmax(300px,380px)_1fr] lg:items-start">
      <section className="flex flex-col gap-5 rounded-card border border-border bg-surface p-6">
        <h2 className="text-xl font-semibold">Informations</h2>
        {!isBoules && <Field label="Organisateur" value={organizer} onChange={setOrganizer} />}
        {isBoules ? (
          <div className="flex flex-col gap-4">
            <Field label="Titre - ligne 1" value={boulesTitleLine1} onChange={setBoulesTitleLine1} />
            <Field label="Titre - ligne 2" value={boulesTitleLine2} onChange={setBoulesTitleLine2} />
          </div>
        ) : (
          <Field label="Titre" value={title} onChange={setTitle} />
        )}
        <Field label="Lieu" value={place} onChange={setPlace} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
          <Field label="Date" type="date" value={date} onChange={setDate} />
          <Field label="Heure" type="time" value={time} onChange={setTime} />
        </div>
        {!isBoules && <Field label="Adresse" value={address} onChange={setAddress} />}
        {isBoules && (
          <label className="flex flex-col gap-2 text-[14px] font-medium">
            Composition des équipes
            <select
              value={posterTeamComposition}
              onChange={(event) => setPosterTeamComposition(event.target.value as TeamComposition)}
              className="min-h-11 rounded-xl border border-border bg-surface-2 px-4 text-foreground outline-none transition-colors focus:border-accent"
            >
              <option value="DOUBLETTES">Doublette</option>
              <option value="TRIPLETTES">Triplette</option>
            </select>
          </label>
        )}
        {isBoules && (
          <fieldset className="flex flex-col gap-3 text-[14px] font-medium">
            <legend>Photo de fond</legend>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Photo de fond de l’affiche">
              {BOULES_BACKGROUNDS.map((background) => (
                <label key={background.id} className={`flex cursor-pointer flex-col gap-2 rounded-xl border p-2 transition-colors ${boulesBackground === background.id ? "border-accent bg-accent/10" : "border-border bg-surface-2 hover:border-accent/60"}`}>
                  <input
                    type="radio"
                    name="boules-background"
                    value={background.id}
                    checked={boulesBackground === background.id}
                    onChange={() => setBoulesBackground(background.id)}
                    className="sr-only"
                  />
                  <NextImage src={background.previewSrc} alt="" width={90} height={128} className="aspect-[3508/4961] w-full rounded-lg object-cover" />
                  <span className="text-center text-[12px] leading-tight">{background.label}</span>
                </label>
              ))}
            </div>
            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-border bg-surface-2 p-3">
              <div className="flex items-center gap-3">
                {customBackgroundUrl ? (
                  <label className={`flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-lg border p-2 ${boulesBackground === "custom" ? "border-accent bg-accent/10" : "border-border"}`}>
                    <input
                      type="radio"
                      name="boules-background"
                      value="custom"
                      checked={boulesBackground === "custom"}
                      onChange={() => setBoulesBackground("custom")}
                      className="sr-only"
                    />
                    <NextImage src={customBackgroundUrl} alt="" width={54} height={76} unoptimized className="aspect-[3508/4961] w-[54px] shrink-0 rounded-md object-cover" />
                    <span className="min-w-0 flex-1 truncate text-[12px]">{customBackgroundName}</span>
                  </label>
                ) : (
                  <span className="flex-1 text-[12px] text-muted">Ajoutez la photo de votre association ou de votre terrain.</span>
                )}
                <label className="cursor-pointer whitespace-nowrap rounded-full border border-accent px-3 py-2 text-[12px] font-semibold text-accent hover:bg-accent/10">
                  {customBackgroundUrl ? "Changer" : "Importer une photo"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    onChange={(event) => {
                      void importCustomBackground(event.target.files?.[0]);
                      event.currentTarget.value = "";
                    }}
                  />
                </label>
              </div>
              {customBackgroundUrl && (
                <button type="button" onClick={removeCustomBackground} className="self-start text-[12px] text-muted underline hover:text-foreground">
                  Retirer la photo importée
                </button>
              )}
              {customBackgroundMessage && <p className="text-[12px] leading-relaxed text-muted" role="status">{customBackgroundMessage}</p>}
            </div>
          </fieldset>
        )}
        {isBoules && (
          <fieldset className="flex flex-col gap-3 text-[14px] font-medium">
            <legend>Visuel de boules</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="Visuel de boules ajouté sur l’affiche">
              {BOULES_VISUALS.map((visual) => (
                <label key={visual.id} className={`flex cursor-pointer flex-col items-center justify-between gap-2 rounded-xl border p-2 transition-colors ${boulesVisual === visual.id ? "border-accent bg-accent/10" : "border-border bg-surface-2 hover:border-accent/60"}`}>
                  <input
                    type="radio"
                    name="boules-visual"
                    value={visual.id}
                    checked={boulesVisual === visual.id}
                    onChange={() => {
                      setBoulesVisual(visual.id);
                      setBoulesVisualSelected(visual.id !== "none");
                    }}
                    className="sr-only"
                  />
                  {visual.src ? (
                    <NextImage src={visual.src} alt="" width={72} height={72} className="aspect-square w-full object-contain" />
                  ) : (
                    <span className="flex aspect-square w-full items-center justify-center rounded-lg border border-dashed border-border text-[24px] font-normal text-muted">—</span>
                  )}
                  <span className="text-center text-[12px] leading-tight">{visual.label}</span>
                </label>
              ))}
            </div>
            {boulesVisual !== "none" && (
              <p className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-[12px] leading-relaxed text-muted">
                Faites glisser la boule sur l’affiche. Utilisez la poignée bleue pour modifier sa taille.
              </p>
            )}
          </fieldset>
        )}
        <div className="grid grid-cols-2 gap-4">
          <Field label="Mise par équipe (€)" type="number" value={stake} onChange={setStake} />
          {!isBoules && <Field label="Mises reversées (%)" type="number" value={percentage} onChange={setPercentage} />}
        </div>
        {isBoules ? (
          <div className="flex flex-col gap-4">
            <Field label="Texte inférieur gauche" multiline value={bottomLeft} onChange={setBottomLeft} />
            <Field label="Texte inférieur central" multiline value={bottomCenter} onChange={setBottomCenter} />
            <Field label="Texte inférieur droit" multiline value={bottomRight} onChange={setBottomRight} />
          </div>
        ) : (
          <Field label="Texte inférieur" value={footer} onChange={setFooter} />
        )}

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
          onPointerDown={() => setBoulesVisualSelected(false)}
          onPointerMove={moveVisual}
          onPointerUp={endVisualInteraction}
          onPointerCancel={endVisualInteraction}
        >
          <image
            data-poster-background="true"
            href={backgroundUrl}
            width="1000"
            height="1414"
            preserveAspectRatio={boulesBackground === "custom" ? "xMidYMid slice" : "none"}
          />
          {isBoules && selectedBoulesVisual.src && (
            <g data-boule-editor="true">
              <image
                href={selectedBoulesVisual.src}
                x={bouleVisualX}
                y={bouleVisualY}
                width={bouleVisualSize}
                height={bouleVisualSize}
                preserveAspectRatio="xMidYMid meet"
                aria-label="Déplacer le visuel de boules"
                onPointerDown={(event) => startVisualInteraction(event, "move")}
                style={{
                  cursor: "grab",
                  filter: "drop-shadow(0 10px 18px rgba(0, 0, 0, 0.45))",
                  touchAction: "none",
                }}
              />
              {boulesVisualSelected && (
                <>
                  <rect
                    x={bouleVisualX}
                    y={bouleVisualY}
                    width={bouleVisualSize}
                    height={bouleVisualSize}
                    rx="8"
                    fill="none"
                    stroke="#1689ff"
                    strokeWidth="4"
                    strokeDasharray="12 8"
                    pointerEvents="none"
                  />
                  <circle
                    cx={bouleVisualX + bouleVisualSize}
                    cy={bouleVisualY + bouleVisualSize}
                    r="18"
                    fill="#1689ff"
                    stroke="#ffffff"
                    strokeWidth="5"
                    aria-label="Modifier la taille du visuel de boules"
                    onPointerDown={(event) => startVisualInteraction(event, "resize")}
                    style={{ cursor: "nwse-resize", touchAction: "none" }}
                  />
                </>
              )}
            </g>
          )}
          {isBoules ? (
            <>
              <rect x="0" y="42" width="1000" height="270" fill="#ffffff" />
              <rect x="0" y="360" width="1000" height="92" fill="#ffffff" />
              <rect x="0" y="580" width="1000" height="72" fill="#ffffff" />
            </>
          ) : null}
          <defs>
            <path id="poster-title-curve" d="M 54 365 Q 500 95 946 365" fill="none" />
          </defs>

          {isBoules ? (
            <>
              <text x="500" y="160" textAnchor="middle" fill="#050505" fontFamily="Impact, Arial Black, sans-serif" fontSize="78" fontWeight="900" letterSpacing="-1.5">
                {boulesTitleLine1.toLocaleUpperCase("fr-FR")}
              </text>
              <text x="500" y="260" textAnchor="middle" fill="#050505" fontFamily="Impact, Arial Black, sans-serif" fontSize="78" fontWeight="900" letterSpacing="-1.5">
                {boulesTitleLine2.toLocaleUpperCase("fr-FR")}
              </text>
              <text x="500" y="407" textAnchor="middle" dominantBaseline="central" fill="#050505" fontFamily="Impact, Arial Black, sans-serif" fontSize="34" fontWeight="900" letterSpacing="0.8">
                {shortFrenchDate(date)} - {place.toLocaleUpperCase("fr-FR")} - {timeLabel(time)}
              </text>
              <text x="500" y="616" textAnchor="middle" dominantBaseline="central" fill="#050505" fontFamily="Impact, Arial Black, sans-serif" fontSize="37" fontWeight="900" letterSpacing="0.4">
                {stake} € LA {teamLabel}
              </text>
              <rect x="30" y="1215" width="940" height="170" rx="26" fill="#05070b" fillOpacity="0.72" stroke="#ffffff" strokeOpacity="0.18" strokeWidth="2" />
              <line x1="304" y1="1235" x2="304" y2="1365" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2.5" />
              <line x1="678" y1="1235" x2="678" y2="1365" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="2.5" />
              <text x="170" y="1258" textAnchor="middle" fill="#ffffff" fontFamily="Arial Black, Arial, sans-serif" fontSize="23" fontWeight="900">
                {bottomLeft.split(/\r?\n/).map((line, index) => <tspan key={`left-${index}`} x="170" dy={index === 0 ? 0 : 45}>{line}</tspan>)}
              </text>
              <text x="500" y="1258" textAnchor="middle" fill="#ffffff" fontFamily="Arial Black, Arial, sans-serif" fontSize="22" fontWeight="900">
                {bottomCenter.split(/\r?\n/).map((line, index) => <tspan key={`center-${index}`} x="500" dy={index === 0 ? 0 : 45}>{line}</tspan>)}
              </text>
              {qrCode ? <PosterQrCode qrCode={qrCode} x={760} y={1128} /> : <text x="830" y="1305" textAnchor="middle" fill="#ffffff" fontFamily="Arial Black, Arial, sans-serif" fontSize="24" fontWeight="900">
                {bottomRight.split(/\r?\n/).map((line, index) => <tspan key={`right-${index}`} x="830" dy={index === 0 ? 0 : 45}>{line}</tspan>)}
              </text>}
            </>
          ) : (
            <>
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
              <text x={qrCode ? 250 : 758} y="1094" textAnchor="middle" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="67" fontWeight="800">
                {stake}€
              </text>
              <text x={qrCode ? 250 : 758} y="1225" textAnchor="middle" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="22" fontWeight="700">
                {percentage} % des mises reversées
              </text>
              {qrCode && <PosterQrCode qrCode={qrCode} x={760} y={1070} />}
              <rect x="222" y="1310" width="556" height="52" rx="26" fill="#ce160c" />
              <text x="500" y="1346" textAnchor="middle" fill="#ffffff" fontFamily="Arial, sans-serif" fontSize="28" fontWeight="700" letterSpacing="4">
                {footer}
              </text>
            </>
          )}
        </svg>
      </section>
    </div>
  );
}
