import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { QUALIFICATION_DESCRIPTION } from "@/lib/tournament/bracket";
import { FINALS_WAIT_MESSAGE, poolResultsComplete } from "@/lib/tournament/score-integrity";
import { ScoreForm } from "@/components/tournament/score-form";
import type { BracketRoundName } from "@/lib/tournament";
import { aurardQualificationDescription, aurardQualifierCountForTournament, aurardRoundsComplete, playingAreaLabel } from "@/lib/tournament";
import { launchFinalsAction, saveBracketScoreAction } from "./actions";
import { LaunchFinalsButton } from "./launch-button";
import { ChampionCelebration } from "@/components/tournament/champion-celebration";

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

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: { teams: { select: { id: true } }, _count: { select: { teams: true } } },
  });
  if (!tournament || tournament.ownerId !== session.user.id) notFound();
  const playingArea = playingAreaLabel(tournament.format);
  const aurardQualifierCount = aurardQualifierCountForTournament({
    teamCount: tournament._count.teams,
    savedCount: tournament.aurardQualifierCount,
    hasStarted: tournament.status !== "REGISTRATION",
  });

  const poolCount = await prisma.pool.count({ where: { tournamentId: id } });
  const aurardMatches = await prisma.aurardMatch.findMany({ where: { tournamentId: id } });
  const matches = await prisma.bracketMatch.findMany({
    where: { tournamentId: id },
    include: { teamA: true, teamB: true },
    orderBy: [{ slotIndex: "asc" }],
  });

  if (matches.length === 0) {
    const pools = await prisma.pool.findMany({ where: { tournamentId: id }, include: { matches: true } });
    const ready = tournament.competitionMode === "AURARD"
      ? aurardRoundsComplete(tournament.teams.map((team) => team.id), aurardMatches, tournament.aurardRounds)
      : pools.length > 0 && pools.every((pool) => poolResultsComplete(pool.matches));
    return (
      <main className="flex-1 px-6 py-10">
        <div className="max-w-2xl mx-auto flex flex-col gap-6 items-center text-center">
          <h1 className="text-3xl font-bold">Tableau final</h1>
          {poolCount === 0 && tournament.competitionMode !== "AURARD" ? (
            <>
              <p className="text-muted">Le tirage des poules n&apos;a pas encore été effectué.</p>
              <ButtonLink href={`/tournaments/${id}/draw`}>Aller au tirage</ButtonLink>
            </>
          ) : (
            <>
              <p className="text-muted">{tournament.competitionMode === "AURARD" ? aurardQualificationDescription(aurardQualifierCount) : QUALIFICATION_DESCRIPTION}</p>
              <LaunchFinalsButton disabled={!ready} action={launchFinalsAction.bind(null, id)} />
              {!ready && <p className="text-sm text-muted">{FINALS_WAIT_MESSAGE}</p>}
            </>
          )}
        </div>
      </main>
    );
  }

  const roundsPresent = ROUND_ORDER.filter((r) => matches.some((m) => m.roundName === r));
  const firstRound = roundsPresent[0];
  const firstRoundMatchCount = matches.filter((m) => m.roundName === firstRound).length;
  const middleGap = firstRoundMatchCount >= 4 ? 98 : 0;
  const matchesColumnHeight =
    firstRoundMatchCount * 326 + Math.max(0, firstRoundMatchCount - 1) * 16 + middleGap;
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
          <>
            <ChampionCelebration />
            <Card id="champion-card" className="champion-reveal text-center py-8 border-accent/50">
            <p className="text-[14px] text-accent mb-1">Champion du concours</p>
            <p className="text-2xl font-bold text-[#30d158]">
              {champion.player1} et {champion.player2}
            </p>
            </Card>
          </>
        )}

        <div className="grid grid-flow-col auto-cols-[minmax(260px,1fr)] items-stretch gap-6 overflow-x-auto pb-4">
          {roundsPresent.map((round) => (
            <div key={round} className="grid grid-rows-[auto_1fr] gap-4 min-w-[260px]">
              <h2 className="text-[14px] font-semibold text-muted uppercase tracking-wide">
                {ROUND_LABELS[round]}
              </h2>
              <div
                className="flex flex-col gap-4"
                style={{
                  minHeight: `${matchesColumnHeight}px`,
                  justifyContent: round === firstRound ? "flex-start" : "space-around",
                }}
              >
              {matches
                .filter((m) => m.roundName === round)
                .sort((a, b) => a.slotIndex - b.slotIndex)
                .map((match, matchIndex) => (
                  <Card
                    key={match.id}
                    className="flex flex-col gap-3"
                    style={
                      round === firstRound && matchIndex === Math.floor(firstRoundMatchCount / 2)
                        ? { marginTop: `${middleGap}px` }
                        : undefined
                    }
                  >
                    {match.tableNumber && (
                      <Badge className="self-start">{playingArea} {match.tableNumber}</Badge>
                    )}
                    {match.isBye ? (
                      <p className="text-[14px] text-muted">
                        {teamLabel(match.teamA ?? match.teamB)} qualifié(e) d&apos;office (bye)
                      </p>
                    ) : (
                      <ScoreForm
                        key={`${match.id}:${match.scoreA}:${match.scoreB}:${match.teamAId}:${match.teamBId}`}
                        action={saveBracketScoreAction.bind(null, id, match.id)}
                        teamAId={match.teamAId}
                        teamBId={match.teamBId}
                        teamALabel={teamLabel(match.teamA)}
                        teamBLabel={teamLabel(match.teamB)}
                        initialScoreA={match.scoreA}
                        initialScoreB={match.scoreB}
                        disabled={!match.teamAId || !match.teamBId}
                        winnerSide={
                          match.winnerId === match.teamAId
                            ? "A"
                            : match.winnerId === match.teamBId
                              ? "B"
                              : null
                        }
                        note={match.status === "TO_REPLAY" ? "Égalité — à rejouer" : undefined}
                      />
                    )}
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
