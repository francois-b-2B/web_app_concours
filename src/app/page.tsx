import Image from "next/image";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FreeGlassBadge } from "@/components/free-glass-badge";

const features = [
  {
    title: "Inscriptions",
    description:
      "Enregistrez jusqu'à 256 équipes par concours.",
  },
  {
    title: "Rondes ou poules",
    description:
      "Choisissez les Rondes ou les poules qualificatives.",
  },
  {
    title: "Classement",
    description:
      "Classement automatique, qualifications et tableau final.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-col items-center">
      <section className="hero-section relative isolate w-full max-w-3xl px-6 pt-32 pb-8 flex flex-col items-center text-center gap-5">
        <span className="hero-glow hero-glow-one" aria-hidden="true" />
        <span className="hero-glow hero-glow-two" aria-hidden="true" />
        <span className="hero-liquid-ribbon hero-liquid-ribbon-one" aria-hidden="true" />
        <span className="hero-liquid-ribbon hero-liquid-ribbon-two" aria-hidden="true" />
        <Image
          aria-hidden="true"
          className="hero-jack-card"
          src="/images/valet-de-coeur.png"
          alt=""
          width={1024}
          height={1536}
          sizes="112px"
        />
        <FreeGlassBadge />
        <p className="text-[15px] font-semibold text-accent">
          Boules • Belote
        </p>
        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-tight">
          Organisez votre concours.
        </h1>
        <p className="max-w-xl text-lg sm:text-xl text-muted">
          Inscriptions, tirages, rondes ou poules, classement et tableau final.
          Tout est calculé, sauvegardé et mis à jour automatiquement.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 mt-2">
          <ButtonLink href="/register" size="lg">
            Créer un compte
          </ButtonLink>
          <ButtonLink href="/login" variant="outline" size="lg">
            Se connecter
          </ButtonLink>
          <div className="relative flex items-center justify-center">
            <ButtonLink href="/essai" variant="outline" size="lg">
              Mode essai
            </ButtonLink>
            <p className="absolute top-full mt-2 whitespace-nowrap text-[13px] text-muted">Mode essai · rien n’est sauvegardé</p>
          </div>
        </div>
      </section>

      <section className="w-full max-w-5xl px-6 py-24 grid grid-cols-1 sm:grid-cols-3 gap-6">
        {features.map((feature) => (
          <Card key={feature.title} className="flex flex-col gap-4">
            <h2 className="text-xl font-semibold">{feature.title}</h2>
            <p className="text-[15px] leading-relaxed text-muted">
              {feature.description}
            </p>
          </Card>
        ))}
      </section>
    </main>
  );
}
