import { notFound } from "next/navigation";
import { Badge, Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { aurardQualifierCountForTournament, aurardRoundsComplete, computeGeneralStandings, playingAreaLabel, rankAurardTeams, rankPoolStandings, visibleAurardMatches } from "@/lib/tournament";
import { AutoRefresh } from "./auto-refresh";

export const dynamic = "force-dynamic";

const ROUND_LABELS: Record<string, string> = {
  R64: "32èmes de finale",
  R32: "16èmes de finale",
  R16: "Huitièmes de finale",
  QF: "Quarts de finale",
  SF: "Demi-finales",
  FINAL: "Finale",
};

function displayScore(score: number | null) {
  return score ?? "—";
}

export default async function PublicTournamentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      teams: { orderBy: { registrationNumber: "asc" } },
      aurardMatches: {
        orderBy: [{ round: "asc" }, { slotIndex: "asc" }],
        include: { teamA: true, teamB: true },
      },
      pools: {
        orderBy: { letter: "asc" },
        include: {
          teams: { orderBy: { positionInPool: "asc" } },
          matches: {
            orderBy: [{ round: "asc" }, { tableNumber: "asc" }],
            include: { teamA: true, teamB: true },
          },
        },
      },
      bracketMatches: {
        orderBy: [{ roundName: "asc" }, { slotIndex: "asc" }],
        include: { teamA: true, teamB: true },
      },
    },
  });
  if (!tournament) notFound();

  const isAurard = tournament.competitionMode === "AURARD";
  const visibleRounds = visibleAurardMatches(tournament.aurardMatches);
  const sportLabel = tournament.format === "BELOTE" ? "Belote" : "Boules";
  const playingArea = playingAreaLabel(tournament.format);
  const compositionLabel = tournament.teamComposition === "TRIPLETTES" ? "Triplette" : "Doublette";
  const drawLabel = isAurard ? "Rondes" : "Poules";
  const teamName = (team: { player1: string; player2: string; player3: string | null } | null) =>
    team ? [team.player1, team.player2, team.player3].filter(Boolean).join(" et ") : "En attente";
  const teamNameById = new Map(tournament.teams.map((team) => [team.id, teamName(team)]));
  const byeScore = tournament.format === "BELOTE" ? { pointsFor: 2000, pointsAgainst: 1000 } : { pointsFor: 13, pointsAgainst: 7 };

  const aurardRanking = isAurard
    ? rankAurardTeams(
        tournament.teams.map((team) => ({ id: team.id, registrationNumber: team.registrationNumber })),
        tournament.aurardMatches,
        byeScore,
      )
    : [];
  const aurardRoundsAreComplete = isAurard && aurardRoundsComplete(
    tournament.teams.map((team) => team.id),
    tournament.aurardMatches,
    tournament.aurardRounds,
  );
  const aurardQualifiedCount = isAurard
    ? aurardQualifierCountForTournament({
        teamCount: tournament.teams.length,
        savedCount: tournament.aurardQualifierCount,
        hasStarted: tournament.status !== "REGISTRATION",
      })
    : 0;

  const poolsForStandings = tournament.pools.map((pool) => ({
    letter: pool.letter,
    teams: pool.teams.map((team) => ({ id: team.id, registrationNumber: team.registrationNumber })),
    matches: pool.matches.map((match) => ({
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      scoreA: match.scoreA,
      scoreB: match.scoreB,
    })),
  }));
  const generalPoolRanking = isAurard ? [] : computeGeneralStandings(poolsForStandings);
  const final = tournament.bracketMatches.find((match) => match.roundName === "FINAL");
  const champion = final?.winnerId
    ? final.teamAId === final.winnerId
      ? final.teamA
      : final.teamB
    : null;

  return (
    <main className="min-h-screen px-4 py-8 sm:px-6">
      <AutoRefresh />
      <div className="max-w-5xl mx-auto flex flex-col gap-8">
        <header className="text-center">
          <p className="text-sm font-semibold text-accent">SUIVI DU CONCOURS</p>
          <h1 className="mt-2 text-3xl sm:text-4xl font-bold">{tournament.name}</h1>
          <p className="mt-2 text-muted">
            {sportLabel} · {compositionLabel} · {drawLabel} · {tournament.date.toLocaleDateString("fr-FR")}
            {tournament.location ? ` · ${tournament.location}` : ""}
          </p>
          <p className="mt-3 text-xs text-muted">Consultation en lecture seule · mise à jour automatique toutes les 15 secondes</p>
        </header>

        <nav aria-label="Rubriques du concours" className="sticky top-0 z-10 -mx-4 flex gap-2 overflow-x-auto border-y border-border bg-background/95 px-4 py-3 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
          {[
            ["#inscriptions", "Inscriptions"],
            ["#tirage", drawLabel],
            ["#classement", "Classement"],
            ["#tableau-final", "Tableau final"],
          ].map(([href, label]) => (
            <a key={href} href={href} className="shrink-0 rounded-pill border border-border px-4 py-2 text-sm font-medium text-foreground hover:border-accent hover:text-accent">
              {label}
            </a>
          ))}
        </nav>

        {champion && (
          <Card className="text-center border-accent/50 py-7">
            <p className="text-sm text-muted">Champion du concours</p>
            <p className="mt-1 text-2xl font-bold">{teamName(champion)}</p>
          </Card>
        )}

        <section id="inscriptions" className="scroll-mt-24 flex flex-col gap-5">
          <div>
            <h2 className="text-2xl font-bold">Inscriptions</h2>
            <p className="mt-1 text-sm text-muted">{tournament.teams.length} équipe(s) inscrite(s)</p>
          </div>
          {tournament.teams.length === 0 ? (
            <p className="text-muted">Aucune équipe n&apos;est inscrite pour le moment.</p>
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[360px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-muted">
                    <th className="px-4 py-3">N°</th>
                    <th className="px-4 py-3">{compositionLabel}</th>
                  </tr>
                </thead>
                <tbody>
                  {tournament.teams.map((team) => (
                    <tr key={team.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-muted">{team.registrationNumber}</td>
                      <td className="px-4 py-3">{teamName(team)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}
        </section>

        <section id="tirage" className="scroll-mt-24 flex flex-col gap-5">
          <div>
            <h2 className="text-2xl font-bold">{drawLabel} et résultats</h2>
            <p className="mt-1 text-sm text-muted">Rencontres et scores du concours</p>
          </div>
          {isAurard ? (
            tournament.aurardMatches.length === 0 ? (
              <p className="text-muted">Le tirage des rondes n&apos;a pas encore été effectué.</p>
            ) : (
              <div className="flex flex-col gap-6">
                {Array.from(new Set(visibleRounds.map((match) => match.round))).sort((a, b) => a - b).map((round) => (
                  <div key={round} className="flex flex-col gap-3">
                    <h3 className="text-xl font-semibold">Ronde {round}</h3>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {visibleRounds.filter((match) => match.round === round).map((match) => (
                        <Card key={match.id} className="flex flex-col gap-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold">{match.isBye ? "Victoire d’office" : `${playingArea} ${match.tableNumber ?? "—"}`}</span>
                            <Badge className={match.status === "DONE" ? "border-success/50 text-success" : "border-border text-muted"}>
                              {match.status === "DONE" ? (match.isBye ? "Dispense" : "Joué") : match.status === "TO_REPLAY" ? "À rejouer" : "À jouer"}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span>{teamName(match.teamA)}</span><strong>{displayScore(match.scoreA)}</strong>
                          </div>
                          {!match.isBye && (
                            <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-sm">
                              <span>{teamName(match.teamB)}</span><strong>{displayScore(match.scoreB)}</strong>
                            </div>
                          )}
                          {match.isBye && <p className="text-xs text-muted">Score attribué : {match.scoreA ?? byeScore.pointsFor} à {match.scoreB ?? byeScore.pointsAgainst}</p>}
                        </Card>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : tournament.pools.length === 0 ? (
            <p className="text-muted">Le tirage des poules n&apos;a pas encore été effectué.</p>
          ) : (
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              {tournament.pools.map((pool) => (
                <Card key={pool.id} className="flex flex-col gap-4">
                  <h3 className="text-xl font-semibold">Poule {pool.letter}</h3>
                  <div className="flex flex-col gap-3">
                    {pool.matches.map((match) => (
                      <div key={match.id} className="border-t border-border pt-3 first:border-0 first:pt-0">
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span>{teamName(match.teamA)}</span><strong>{displayScore(match.scoreA)}</strong>
                        </div>
                        <div className="mt-1 flex items-center justify-between gap-3 text-sm">
                          <span>{teamName(match.teamB)}</span><strong>{displayScore(match.scoreB)}</strong>
                        </div>
                      </div>
                    ))}
                    {pool.matches.length === 0 && <p className="text-sm text-muted">Aucune rencontre pour le moment.</p>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section id="classement" className="scroll-mt-24 flex flex-col gap-5">
          <div>
            <h2 className="text-2xl font-bold">Classement</h2>
            <p className="mt-1 text-sm text-muted">{isAurard ? "Classement provisoire des rondes" : "Classement général des poules"}</p>
          </div>
          {isAurard ? (
            tournament.aurardMatches.length === 0 ? (
              <p className="text-muted">Le classement apparaîtra après le début des rondes.</p>
            ) : (
              <Card className="overflow-x-auto p-0">
                <table className="w-full min-w-[650px] text-sm">
                  <thead><tr className="border-b border-border text-left text-muted">
                    <th className="px-4 py-3">#</th><th className="px-4 py-3">Équipe</th>
                    <th className="px-4 py-3 text-center">Parties</th><th className="px-4 py-3 text-center">V</th>
                    <th className="px-4 py-3 text-center">Points</th><th className="px-4 py-3 text-center">Diff.</th>
                    <th className="px-4 py-3 text-right">Qualifiée</th>
                  </tr></thead>
                  <tbody>{aurardRanking.map((row, index) => (
                    <tr key={row.teamId} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-muted">{index + 1}</td><td className="px-4 py-3">{teamNameById.get(row.teamId)}</td>
                      <td className="px-4 py-3 text-center">{row.played}</td><td className="px-4 py-3 text-center">{row.wins}</td>
                      <td className="px-4 py-3 text-center">{row.pointsFor}</td><td className="px-4 py-3 text-center">{row.diff > 0 ? `+${row.diff}` : row.diff}</td>
                      <td className="px-4 py-3 text-right">{aurardRoundsAreComplete && index < aurardQualifiedCount && <Badge>Qualifiée</Badge>}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </Card>
            )
          ) : generalPoolRanking.length === 0 ? (
            <p className="text-muted">Le classement apparaîtra après le début des rencontres.</p>
          ) : (
            <Card className="overflow-x-auto p-0">
              <table className="w-full min-w-[520px] text-sm">
                <thead><tr className="border-b border-border text-left text-muted">
                  <th className="px-4 py-3">#</th><th className="px-4 py-3">Équipe</th><th className="px-4 py-3 text-center">Poule</th>
                  <th className="px-4 py-3 text-center">J</th><th className="px-4 py-3 text-center">V</th><th className="px-4 py-3 text-center">Diff.</th>
                </tr></thead>
                <tbody>{generalPoolRanking.map((row) => (
                  <tr key={row.teamId} className="border-b border-border last:border-0">
                    <td className="px-4 py-3 text-muted">{row.rankGeneral}</td><td className="px-4 py-3">{teamNameById.get(row.teamId)}</td>
                    <td className="px-4 py-3 text-center">{row.poolLetter}</td><td className="px-4 py-3 text-center">{row.played}</td>
                    <td className="px-4 py-3 text-center">{row.wins}</td><td className="px-4 py-3 text-center">{row.diff > 0 ? `+${row.diff}` : row.diff}</td>
                  </tr>
                ))}</tbody>
              </table>
            </Card>
          )}
          {!isAurard && tournament.pools.length > 0 && (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              {tournament.pools.map((pool) => {
                const ranked = rankPoolStandings(
                  pool.teams.map((team) => ({ id: team.id, registrationNumber: team.registrationNumber })),
                  pool.matches.map((match) => ({ teamAId: match.teamAId, teamBId: match.teamBId, scoreA: match.scoreA, scoreB: match.scoreB })),
                );
                return (
                  <Card key={pool.id} className="flex flex-col gap-3">
                    <h3 className="font-semibold">Poule {pool.letter}</h3>
                    {ranked.map((row) => (
                      <div key={row.teamId} className="flex justify-between gap-3 border-t border-border pt-2 text-sm">
                        <span>{teamNameById.get(row.teamId)}</span><span className="text-muted">{row.wins} V · {row.diff > 0 ? `+${row.diff}` : row.diff}</span>
                      </div>
                    ))}
                  </Card>
                );
              })}
            </div>
          )}
        </section>

        <section id="tableau-final" className="scroll-mt-24 flex flex-col gap-5">
          <h2 className="text-2xl font-bold">Tableau final</h2>
          {tournament.bracketMatches.length === 0 ? (
            <p className="text-muted">Le tableau final n&apos;a pas encore commencé.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tournament.bracketMatches.map((match) => (
                <Card key={match.id} className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <Badge>{ROUND_LABELS[match.roundName]}</Badge>
                    {match.tableNumber && <span className="text-xs text-muted">{playingArea} {match.tableNumber}</span>}
                  </div>
                  <div className="flex justify-between gap-3 text-sm"><span>{teamName(match.teamA)}</span><strong>{displayScore(match.scoreA)}</strong></div>
                  <div className="flex justify-between gap-3 border-t border-border pt-3 text-sm"><span>{teamName(match.teamB)}</span><strong>{displayScore(match.scoreB)}</strong></div>
                </Card>
              ))}
            </div>
          )}
        </section>
        <p className="pb-4 text-center text-xs text-muted">Données consultables uniquement · actualisation automatique</p>
      </div>
    </main>
  );
}
