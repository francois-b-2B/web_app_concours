import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { addTeamAction, deleteTeamAction, togglePaymentAction } from "./actions";
import { AddTeamForm } from "./add-team-form";

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
    include: { teams: { orderBy: { registrationNumber: "asc" } } },
  });
  if (!tournament || tournament.ownerId !== session.user.id) notFound();

  const paidCount = tournament.teams.filter((t) => t.paymentStatus === "PAID").length;

  return (
    <main className="flex-1 px-6 py-10">
      <div className="max-w-3xl mx-auto flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold">Inscriptions</h1>
          <p className="text-[15px] text-muted mt-1">
            {tournament.teams.length} / {tournament.maxTeams} équipes · {paidCount} réglée(s)
          </p>
        </div>

        <Card>
          <AddTeamForm action={addTeamAction.bind(null, tournament.id)} />
        </Card>

        <div className="flex flex-col gap-2">
          {tournament.teams.map((team) => (
            <Card key={team.id} className="flex items-center justify-between gap-4 py-4">
              <div className="flex items-center gap-4">
                <span className="text-[14px] text-muted w-8">#{team.registrationNumber}</span>
                <div>
                  <p className="font-medium">
                    {team.player1} et {team.player2}
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
                <form action={deleteTeamAction.bind(null, tournament.id, team.id)}>
                  <Button type="submit" variant="ghost" size="md" className="text-danger">
                    Retirer
                  </Button>
                </form>
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
