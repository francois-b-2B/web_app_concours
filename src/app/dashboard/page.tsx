import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ButtonLink, Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/card";
import { signOutAction } from "./actions";

const formatLabel: Record<string, string> = {
  BELOTE: "Belote",
  BOULES: "Boules",
};

const statusLabel: Record<string, string> = {
  REGISTRATION: "Inscriptions",
  DRAWN: "Poules tirées",
  POOLS_IN_PROGRESS: "Poules en cours",
  FINALS: "Phase finale",
  DONE: "Terminé",
};

export default async function DashboardPage() {
  const session = await auth();
  const tournaments = await prisma.tournament.findMany({
    where: { ownerId: session!.user.id },
    orderBy: { date: "desc" },
    include: { _count: { select: { teams: true } } },
  });

  return (
    <main className="flex-1 px-6 py-16">
      <div className="max-w-4xl mx-auto flex flex-col gap-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[15px] text-muted">Bonjour {session?.user.name ?? session?.user.email}</p>
            <h1 className="text-3xl font-bold">Tes concours</h1>
          </div>
          <div className="flex items-center gap-4">
            <ButtonLink href="/tournaments/new">Nouveau concours</ButtonLink>
            <form action={signOutAction}>
              <Button type="submit" variant="ghost">
                Se déconnecter
              </Button>
            </form>
          </div>
        </div>

        {tournaments.length === 0 ? (
          <Card className="text-center py-16">
            <p className="text-muted">Aucun concours pour l&apos;instant.</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {tournaments.map((t) => (
              <Card key={t.id} className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Badge>{formatLabel[t.format]}</Badge>
                  <span className="text-[13px] text-muted">{statusLabel[t.status]}</span>
                </div>
                <h2 className="text-xl font-semibold">{t.name}</h2>
                <p className="text-[14px] text-muted">
                  {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(t.date)}
                  {t.location ? ` · ${t.location}` : ""}
                </p>
                <p className="text-[14px] text-muted">{t._count.teams} équipe(s) inscrite(s)</p>
                <ButtonLink href={`/tournaments/${t.id}/teams`} variant="secondary" className="mt-2">
                  Ouvrir
                </ButtonLink>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
