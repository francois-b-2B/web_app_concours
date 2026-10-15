import { Card } from "@/components/ui/card";
import { QUALIFICATION_DESCRIPTION } from "@/lib/tournament/bracket";

export default function RulesPage() {
  return (
    <main className="flex-1 px-6 py-10">
      <div className="max-w-3xl mx-auto flex flex-col gap-6">
        <div>
          <h1 className="text-3xl font-bold">Fonctionnement du tirage</h1>
          <p className="mt-2 text-muted">Une organisation simple, équitable et automatique.</p>
        </div>

        <Card className="flex flex-col gap-5 text-[17px] leading-relaxed">
          <div>
            <h2 className="text-xl font-semibold text-accent">Les Rondes</h2>
            <p className="mt-2">
              Il n&apos;y a pas de groupes fixes. À chaque ronde, l&apos;application tire de
              nouveaux adversaires au sort. Chaque équipe joue 2, 3 ou 4 parties, selon
              le choix de l&apos;organisateur. L&apos;application évite de refaire le même match
              quand c&apos;est possible.
              <span className="mt-3 block text-muted">
                S&apos;il y a un nombre impair d&apos;équipes, une équipe reçoit une victoire d&apos;office.
                Une même équipe ne peut pas recevoir cette dispense deux fois.
              </span>
              <span className="mt-3 block text-muted">
                Il faut au moins 6 équipes pour lancer les rondes. L&apos;application propose
                automatiquement 4 qualifiées de 6 à 15 équipes, 8 de 16 à 32, 16 de 33 à 64,
                32 de 65 à 128 et 64 de 129 à 256. Avant la première ronde, l&apos;organisateur peut
                choisir un tableau de 4, 8, 16, 32 ou 64 équipes, toujours plus petit que le nombre
                d&apos;équipes inscrites. Ce choix est ensuite verrouillé au lancement des rondes.
              </span>
            </p>
          </div>
          <div>
            <h2 className="text-xl font-semibold text-accent">Les Poules</h2>
            <p className="mt-2">
              Les équipes sont réparties dans de petits groupes de 3 ou 4 équipes.
              Dans un groupe, chaque équipe joue contre les autres équipes du même groupe.
              Elle reste dans ce groupe pendant cette étape.
              <span className="mt-3 block text-muted">{QUALIFICATION_DESCRIPTION}</span>
            </p>
          </div>
        </Card>
      </div>
    </main>
  );
}
