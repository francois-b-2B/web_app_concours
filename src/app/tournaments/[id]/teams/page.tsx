import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui/card";
import { addTeamAction, deleteTeamAction, togglePaymentAction, updateTeamAction } from "./actions";
import { AddTeamForm } from "./add-team-form";
import { EditTeamForm } from "./edit-team-form";
import { RemoveTeamForm } from "./remove-team-form";
import { REGISTRATION_LOCK_MESSAGE } from "@/lib/tournament/score-integrity";
import { FreeGlassBadge } from "@/components/free-glass-badge";

export default async function TeamsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user.id) notFound();

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { _count: { select: { pools: true, aurardMatches: true } }, teams: { orderBy: { registrationNumber: "asc" } } },
  });
  if (!tournament || tournament.ownerId !== session.user.id) notFound();

  const paidCount = tournament.teams.filter((t) => t.paymentStatus === "PAID").length;
  const registrationLocked = tournament._count.pools > 0 || tournament._count.aurardMatches > 0;

  return (
    <main className="flex-1 px-6 py-10">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <div className="section-heading-with-badge relative min-h-28 pr-32">
          <FreeGlassBadge withBeams />
          <h1 className="text-3xl font-bold">Inscriptions</h1>
          {tournament.competitionMode === "AURARD" && (
            <Badge className="mt-3 border-accent/50 text-accent">Ronde + Tableau final (pour association), réduit le temps d’attente</Badge>
          )}
        </div>

        <Card>
          <AddTeamForm
            disabled={registrationLocked}
            triplettes={tournament.teamComposition === "TRIPLETTES"}
            action={addTeamAction.bind(null, tournament.id)}
          />
          {registrationLocked && <p className="mt-3 text-sm text-muted">{REGISTRATION_LOCK_MESSAGE}</p>}
        </Card>

        <p className="text-[15px] text-muted">
          <strong className="font-semibold text-accent">{tournament.teams.length}</strong> / {tournament.maxTeams} équipes max · <strong className="font-semibold text-accent">{paidCount}</strong> réglée(s)
        </p>

        <div className="flex flex-col gap-2">
          {tournament.teams.map((team) => (
            <Card key={team.id} className="flex flex-wrap items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-4">
                <span className="text-[14px] text-muted w-8">#{team.registrationNumber}</span>
                <div>
                  <p className="font-medium">
                    {team.player1} et {team.player2}{team.player3 ? ` et ${team.player3}` : ""}
                  </p>
                  {team.contact && <p className="text-[13px] text-muted">{team.contact}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <form action={togglePaymentAction.bind(null, tournament.id, team.id)}>
                  <button type="submit">
                    <Badge
                      className={
                        team.paymentStatus === "PAID"
                          ? "border-success/50 text-success"
                          : "border-white/20 text-muted"
                      }
                    >
                      {team.paymentStatus === "PAID" ? "Réglée" : "En attente"}
                    </Badge>
                  </button>
                </form>
                <RemoveTeamForm
                  disabled={registrationLocked}
                  teamName={`${team.player1} et ${team.player2}${team.player3 ? ` et ${team.player3}` : ""}`}
                  action={deleteTeamAction.bind(null, tournament.id, team.id)}
                />
                <EditTeamForm
                  action={updateTeamAction.bind(null, tournament.id, team.id)}
                  player1={team.player1}
                  player2={team.player2}
                  player3={team.player3}
                  triplettes={tournament.teamComposition === "TRIPLETTES"}
                  contact={team.contact}
                />
              </div>
            </Card>
          ))}
          {tournament.teams.length === 0 && (
            <p className="text-center text-muted py-8">Aucune équipe inscrite pour l&apos;instant.</p>
          )}
        </div>
      </div>
    </main>
  );
}
