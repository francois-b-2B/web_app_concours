import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const features = [
  {
    title: "Inscriptions",
    description:
      "Enregistrez les doublettes, suivez le statut des règlements, jusqu'à 128 équipes par concours.",
  },
  {
    title: "Tirage & poules",
    description:
      "Tirage aléatoire, répartition en poules de 3 et 4, rencontres générées automatiquement.",
  },
  {
    title: "Classement & bracket",
    description:
      "Classement par poule et général en temps réel, tableau final avec seeding automatique.",
  },
];

export default function Home() {
  return (
    <main className="flex flex-col items-center">
      <section className="w-full max-w-3xl px-6 pt-32 pb-8 flex flex-col items-center text-center gap-5">
        <p className="text-[15px] font-semibold text-accent">
          Concours de belote &amp; boules
        </p>
        <h1 className="text-5xl sm:text-7xl font-bold tracking-tight leading-tight">
          Organisez votre concours.
          <br />
          Sans classeur Excel.
        </h1>
        <p className="max-w-xl text-lg sm:text-xl text-muted">
          Inscriptions, tirage des poules, feuilles de match et tableau final —
          tout est calculé et mis à jour automatiquement.
        </p>
        <div className="flex items-center gap-6 mt-2">
          <ButtonLink href="/register" size="lg">
            Créer un compte
          </ButtonLink>
          <ButtonLink href="/login" variant="ghost" size="lg">
            Se connecter
          </ButtonLink>
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
