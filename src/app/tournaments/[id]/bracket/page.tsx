import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui/card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { BracketRoundName } from "@/lib/tournament";
import { launchFinalsAction, saveBracketScoreAction } from "./actions";
import { LaunchFinalsButton } from "./launch-button";

const ROUND_LABELS: Record<BracketRoundName, string> = {
  R64: "32èmes de finale",
  R32: "16èmes de finale",
  R16: "Huitièmes de finale",
  QF: "Quarts de finale",
  SF: "Demi-finales",
  FINAL: "Finale",
};

const ROUND_ORDER: BracketRoundName[] = ["R64", "R32", "R16", "QF", "SF", "FINAL"];

function teamLabel(team: { player1: string; player2: string } | null) {
  return team ? `${team.player1} et ${team.player2}` : "En attente";
}

export default async function BracketPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user.id) notFound();

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament || tournament.ownerId !== session.user.id) notFound();

  const poolCount = await prisma.pool.count({ where: { tournamentId: id } });
  const matches = await prisma.bracketMatch.findMany({
    where: { tournamentId: id },
    include: { teamA: true, teamB: true },
    orderBy: [{ slotIndex: "asc" }],
  });

  if (matches.length === 0) {
    return (
      <main className="flex-1 px-6 py-10">
        <div className="max-w-2xl mx-auto flex flex-col gap-6 items-center text-center">
          <h1 className="text-3xl font-bold">Tableau final</h1>
          {poolCount === 0 ? (
            <>
              <p className="text-muted">Le tirage des poules n&apos;a pas encore été effectué.</p>
              <ButtonLink href={`/tournaments/${id}/draw`}>Aller au tirage</ButtonLink>
            </>
          ) : (
            <>
              <p className="text-muted">
                Qualifie les 2 premiers de chaque poule + le repêchage des meilleurs suivants,
                puis seed le tableau automatiquement.
              </p>
              <LaunchFinalsButton action={launchFinalsAction.bind(null, id)} />
            </>
          )}
        </div>
      </main>
    );
  }

  const roundsPresent = ROUND_ORDER.filter((r) => matches.some((m) => m.roundName === r));
  const finalMatch = matches.find((m) => m.roundName === "FINAL");
  const champion = finalMatch?.winnerId
    ? finalMatch.teamAId === finalMatch.winnerId
      ? finalMatch.teamA
      : finalMatch.teamB
    : null;

  return (
    <main className="flex-1 px-6 py-10">
      <div className="max-w-5xl mx-auto flex flex-col gap-10">
        <h1 className="text-3xl font-bold">Tableau final</h1>

        {champion && (
          <Card className="text-center py-8 border-accent/50">
            <p className="text-[14px] text-muted mb-1">Champion du concours</p>
            <p className="text-2xl font-bold">
              {champion.player1} et {champion.player2}
            </p>
          </Card>
        )}

        <div className="flex gap-6 overflow-x-auto pb-4">
          {roundsPresent.map((round) => (
            <div key={round} className="flex flex-col gap-4 min-w-[260px]">
              <h2 className="text-[14px] font-semibold text-muted uppercase tracking-wide">
                {ROUND_LABELS[round]}
              </h2>
              {matches
                .filter((m) => m.roundName === round)
                .sort((a, b) => a.slotIndex - b.slotIndex)
                .map((match) => (
                  <Card key={match.id} className="flex flex-col gap-3">
                    {match.tableNumber && <Badge className="self-start">Table {match.tableNumber}</Badge>}
                    {match.isBye ? (
                      <p className="text-[14px] text-muted">
                        {teamLabel(match.teamA ?? match.teamB)} qualifié(e) d&apos;office (bye)
                      </p>
                    ) : (
                      <form
                        action={saveBracketScoreAction.bind(null, id, match.id)}
                        className="flex flex-col gap-2"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex-1 text-[14px] ${
                              match.winnerId === match.teamAId ? "font-semibold" : "text-muted"
                            }`}
                          >
                            {teamLabel(match.teamA)}
                          </span>
                          <Input
                            type="number"
                            name="scoreA"
                            min={0}
                            disabled={!match.teamAId || !match.teamBId}
                            defaultValue={match.scoreA ?? undefined}
                            className="w-16 text-center py-1.5"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`flex-1 text-[14px] ${
                              match.winnerId === match.teamBId ? "font-semibold" : "text-muted"
                            }`}
                          >
                            {teamLabel(match.teamB)}
                          </span>
                          <Input
                            type="number"
                            name="scoreB"
                            min={0}
                            disabled={!match.teamAId || !match.teamBId}
                            defaultValue={match.scoreB ?? undefined}
                            className="w-16 text-center py-1.5"
                          />
                        </div>
                        {match.status === "TO_REPLAY" && (
                          <p className="text-[12px] text-danger">Égalité — à rejouer</p>
                        )}
                        <Button
                          type="submit"
                          variant="secondary"
                          size="md"
                          disabled={!match.teamAId || !match.teamBId}
                        >
                          Enregistrer
                        </Button>
                      </form>
                    )}
                  </Card>
                ))}
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
