import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ButtonLink, Button } from "@/components/ui/button";
import { Card, Badge } from "@/components/ui/card";
import { isAdminEmail } from "@/lib/admin";
import { deleteTournamentAction, signOutAction } from "./actions";
import { DeleteTournamentForm } from "./delete-tournament-form";

const formatLabel: Record<string, string> = {
  BELOTE: "Belote",
  BOULES: "Boules",
};

const statusLabel: Record<string, string> = {
  REGISTRATION: "Inscriptions",
  DRAWN: "Poules tirées",
  FINALS: "Phase finale",
  DONE: "Terminé",
};

function tournamentStatusLabel(status: string, competitionMode: string) {
  if (status === "POOLS_IN_PROGRESS") {
    return competitionMode === "AURARD" ? "Rondes en cours" : "Poules en cours";
  }
  return statusLabel[status];
}

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
            {isAdminEmail(session?.user.email) && (
              <ButtonLink href="/admin/statistics" variant="outline">
                Statistiques
              </ButtonLink>
            )}
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
                  <span className="text-[13px] text-muted">{tournamentStatusLabel(t.status, t.competitionMode)}</span>
                </div>
                <h2 className="text-xl font-semibold">{t.name}</h2>
                <p className="text-[14px] text-muted">
                  {new Intl.DateTimeFormat("fr-FR", { dateStyle: "long" }).format(t.date)}
                  {t.location ? ` · ${t.location}` : ""}
                </p>
                <p className="text-[14px] text-muted">{t._count.teams} équipe(s) inscrite(s)</p>
                <div className="mt-2 flex flex-col gap-3 sm:flex-row">
                  <ButtonLink href={`/tournaments/${t.id}/teams`} className="w-full flex-1">
                    Ouvrir
                  </ButtonLink>
                  <DeleteTournamentForm
                    tournamentName={t.name}
                    action={deleteTournamentAction.bind(null, t.id)}
                  />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
