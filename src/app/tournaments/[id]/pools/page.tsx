import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";

export default async function PoolsOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user.id) notFound();

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      pools: {
        orderBy: { letter: "asc" },
        include: {
          teams: { orderBy: { positionInPool: "asc" } },
          matches: true,
        },
      },
    },
  });
  if (!tournament || tournament.ownerId !== session.user.id) notFound();

  if (tournament.pools.length === 0) {
    return (
      <main className="flex-1 px-6 py-10">
        <div className="max-w-2xl mx-auto flex flex-col gap-6 items-center text-center">
          <h1 className="text-3xl font-bold">Poules</h1>
          <p className="text-muted">Le tirage n&apos;a pas encore été effectué.</p>
          <ButtonLink href={`/tournaments/${id}/draw`}>Aller au tirage</ButtonLink>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-6 py-10">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <h1 className="text-3xl font-bold">Poules</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {tournament.pools.map((pool) => {
            const playedCount = pool.matches.filter((m) => m.status !== "PENDING").length;
            return (
              <Card key={pool.id} className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Poule {pool.letter}</h2>
                  <span className="text-[13px] text-muted">
                    {playedCount} / {pool.matches.length} matchs joués
                  </span>
                </div>
                <ul className="flex flex-col gap-1">
                  {pool.teams.map((team) => (
                    <li key={team.id} className="text-[14px] text-muted">
                      {team.positionInPool}. {team.player1} et {team.player2}
                    </li>
                  ))}
                </ul>
                <ButtonLink href={`/tournaments/${id}/pools/${pool.letter}`} variant="secondary">
                  Feuille de match
                </ButtonLink>
              </Card>
            );
          })}
        </div>
      </div>
    </main>
  );
}
