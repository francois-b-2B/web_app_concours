import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { computePoolPlan, InvalidTeamCountError, bracketSizeForPoolCount } from "@/lib/tournament";
import { drawPoolsAction } from "./actions";
import { DrawButton } from "./draw-button";

export default async function DrawPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user.id) notFound();

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { teams: true, pools: { include: { teams: true } } },
  });
  if (!tournament || tournament.ownerId !== session.user.id) notFound();

  const teamCount = tournament.teams.length;

  if (tournament.pools.length > 0) {
    return (
      <main className="flex-1 px-6 py-10">
        <div className="max-w-2xl mx-auto flex flex-col gap-6 items-center text-center">
          <h1 className="text-3xl font-bold">Tirage effectué</h1>
          <p className="text-muted">
            {tournament.pools.length} poule(s) formée(s) à partir de {teamCount} équipes.
          </p>
          <ButtonLink href={`/tournaments/${id}/pools`}>Voir les poules</ButtonLink>
        </div>
      </main>
    );
  }

  let planPreview: { poolsOf4: number; poolsOf3: number; bracketSize: number } | null = null;
  let planError: string | null = null;
  try {
    const plan = computePoolPlan(teamCount);
    planPreview = {
      poolsOf4: plan.poolsOf4,
      poolsOf3: plan.poolsOf3,
      bracketSize: bracketSizeForPoolCount(plan.pools.length),
    };
  } catch (err) {
    planError = err instanceof InvalidTeamCountError ? err.message : "Erreur inattendue.";
  }

  return (
    <main className="flex-1 px-6 py-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-8 items-center text-center">
        <div>
          <h1 className="text-3xl font-bold">Tirage des poules</h1>
          <p className="text-muted mt-2">{teamCount} équipe(s) inscrite(s).</p>
        </div>

        {planError ? (
          <Card className="w-full">
            <p className="text-[15px] text-danger">{planError}</p>
          </Card>
        ) : (
          planPreview && (
            <Card className="w-full flex flex-col gap-2 text-left">
              <p className="text-[15px]">
                <strong>{planPreview.poolsOf4}</strong> poule(s) de 4 et{" "}
                <strong>{planPreview.poolsOf3}</strong> poule(s) de 3
              </p>
              <p className="text-[15px] text-muted">
                Tableau final prévu sur {planPreview.bracketSize} équipes.
              </p>
            </Card>
          )
        )}

        {!planError && <DrawButton action={drawPoolsAction.bind(null, id)} />}
      </div>
    </main>
  );
}
