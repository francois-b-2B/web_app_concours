import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Présentation | Concours Belote & Boules",
  description: "Découvrez en vidéo comment organiser un concours de boules ou de belote.",
};

export default function PresentationPage() {
  return (
    <main className="flex-1 px-6 py-16 sm:py-24">
      <section className="mx-auto flex w-full max-w-5xl flex-col gap-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex max-w-2xl flex-col gap-3">
            <p className="text-[15px] font-semibold text-accent">Présentation</p>
            <h1 className="text-4xl font-bold tracking-tight sm:text-6xl">
              Organisez votre concours.
            </h1>
            <p className="text-lg text-muted sm:text-xl">
              Découvrez en quelques secondes les étapes essentielles pour inscrire les équipes,
              lancer les rencontres et suivre les résultats en temps réel.
            </p>
          </div>
          <ButtonLink href="/" variant="ghost" size="md" className="self-start sm:self-auto">
            Retour à l’accueil
          </ButtonLink>
        </div>

        <div className="overflow-hidden rounded-card border border-border bg-surface shadow-2xl">
          <video
            className="block h-auto w-full bg-black"
            controls
            playsInline
            preload="metadata"
            aria-label="Vidéo de présentation de l’application"
          >
            <source src="/videos/presentation-concours.mp4" type="video/mp4" />
            Votre navigateur ne prend pas en charge la lecture des vidéos.
          </video>
        </div>

        <p className="text-center text-[14px] text-muted">
          Présentation vidéo · boules et belote · résultats consultables en temps réel
        </p>
      </section>
    </main>
  );
}
