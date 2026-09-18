import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { rankPoolStandings, computeGeneralStandings, bracketSizeForPoolCount } from "@/lib/tournament";

export default async function StandingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user.id) notFound();

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament || tournament.ownerId !== session.user.id) notFound();

  const pools = await prisma.pool.findMany({
    where: { tournamentId: id },
    orderBy: { letter: "asc" },
    include: { teams: true, matches: true },
  });

  if (pools.length === 0) {
    return (
      <main className="flex-1 px-6 py-10">
        <div className="max-w-2xl mx-auto flex flex-col gap-6 items-center text-center">
          <h1 className="text-3xl font-bold">Classement</h1>
          <p className="text-muted">Le tirage n&apos;a pas encore été effectué.</p>
          <ButtonLink href={`/tournaments/${id}/draw`}>Aller au tirage</ButtonLink>
        </div>
      </main>
    );
  }

  const teamNameById = new Map(
    pools.flatMap((p) => p.teams.map((t) => [t.id, `${t.player1} et ${t.player2}`] as const))
  );

  const poolsForLib = pools.map((p) => ({
    letter: p.letter,
    teams: p.teams.map((t) => ({ id: t.id, registrationNumber: t.registrationNumber })),
    matches: p.matches.map((m) => ({
      teamAId: m.teamAId,
      teamBId: m.teamBId,
      scoreA: m.scoreA,
      scoreB: m.scoreB,
    })),
  }));

  const bracketSize = bracketSizeForPoolCount(pools.length);
  const general = computeGeneralStandings(poolsForLib);
  const qualifiedCount = Math.min(bracketSize, general.length);

  return (
    <main className="flex-1 px-6 py-10">
      <div className="max-w-4xl mx-auto flex flex-col gap-10">
        <h1 className="text-3xl font-bold">Classement</h1>

        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold">Classement général</h2>
          <Card className="p-0 overflow-hidden">
            <table className="w-full text-[14px]">
              <thead>
                <tr className="text-left text-muted border-b border-border">
                  <th className="px-4 py-3 font-medium">#</th>
                  <th className="px-4 py-3 font-medium">Doublette</th>
                  <th className="px-4 py-3 font-medium">Poule</th>
                  <th className="px-4 py-3 font-medium text-center">V</th>
                  <th className="px-4 py-3 font-medium text-center">Diff</th>
                  <th className="px-4 py-3 font-medium text-right">Qualifié</th>
                </tr>
              </thead>
              <tbody>
                {general.map((row) => (
                  <tr key={row.teamId} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-muted">{row.rankGeneral}</td>
                    <td className="px-4 py-3">{teamNameById.get(row.teamId)}</td>
                    <td className="px-4 py-3 text-muted">
                      {row.poolLetter} ({row.rankInPool}
                      {row.rankInPool === 1 ? "re" : "e"})
                    </td>
                    <td className="px-4 py-3 text-center">{row.wins}</td>
                    <td className="px-4 py-3 text-center">
                      {row.diff > 0 ? `+${row.diff}` : row.diff}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {row.rankGeneral <= qualifiedCount && <Badge>Qualifié</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <h2 className="text-xl font-semibold">Par poule</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {pools.map((pool) => {
              const ranked = rankPoolStandings(
                pool.teams.map((t) => ({ id: t.id, registrationNumber: t.registrationNumber })),
                pool.matches.map((m) => ({
                  teamAId: m.teamAId,
                  teamBId: m.teamBId,
                  scoreA: m.scoreA,
                  scoreB: m.scoreB,
                }))
              );
              return (
                <Card key={pool.id} className="flex flex-col gap-3">
                  <h3 className="text-lg font-semibold">Poule {pool.letter}</h3>
                  <table className="w-full text-[14px]">
                    <thead>
                      <tr className="text-left text-muted">
                        <th className="py-1.5 font-medium">Doublette</th>
                        <th className="py-1.5 font-medium text-center">J</th>
                        <th className="py-1.5 font-medium text-center">V</th>
                        <th className="py-1.5 font-medium text-center">Diff</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ranked.map((row) => (
                        <tr key={row.teamId}>
                          <td className="py-1.5">{teamNameById.get(row.teamId)}</td>
                          <td className="py-1.5 text-center">{row.played}</td>
                          <td className="py-1.5 text-center">{row.wins}</td>
                          <td className="py-1.5 text-center">
                            {row.diff > 0 ? `+${row.diff}` : row.diff}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              );
            })}
          </div>
        </div>
      </div>
    </main>
  );
}
