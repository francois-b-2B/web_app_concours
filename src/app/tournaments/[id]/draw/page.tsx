import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { ScoreForm } from "@/components/tournament/score-form";
import {
  computePoolPlan,
  InvalidTeamCountError,
  bracketSizeForPoolCount,
  aurardQualificationDescription,
  aurardQualifierCountForTournament,
  AURARD_QUALIFIER_COUNTS,
  bracketSizeForAurardTeamCount,
  getDrawMinimumTeamMessage,
  isAurardQualifierCount,
  playingAreaLabel,
  rankAurardTeams,
  aurardRoundsComplete,
  visibleAurardMatches,
} from "@/lib/tournament";
import { drawAurardAction, drawPoolsAction, saveAurardScoreAction, startNextAurardRoundAction } from "./actions";
import { saveAurardQualifierCountAction, saveAurardRoundsAction } from "../teams/actions";
import { AurardQualifiersForm } from "../teams/aurard-qualifiers-form";
import { AurardRoundsForm } from "../teams/aurard-rounds-form";
import { DrawButton } from "./draw-button";

export default async function DrawPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user.id) notFound();

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: {
      teams: true,
      pools: { include: { teams: true } },
      aurardMatches: {
        include: { teamA: true, teamB: true },
        orderBy: { slotIndex: "asc" },
      },
    },
  });
  if (!tournament || tournament.ownerId !== session.user.id) notFound();

  const teamCount = tournament.teams.length;
  const playingArea = playingAreaLabel(tournament.format);
  const aurardQualifierCount = aurardQualifierCountForTournament({
    teamCount,
    savedCount: tournament.aurardQualifierCount,
    hasStarted: tournament.status !== "REGISTRATION",
  });
  const selectedQualifierCount = (
    tournament.aurardQualifierCount !== null &&
    tournament.aurardQualifierCount < teamCount &&
    isAurardQualifierCount(tournament.aurardQualifierCount)
  ) ? tournament.aurardQualifierCount : null;
  const settingsAreSaved = tournament.aurardRounds !== null &&
    tournament.aurardQualifierCount !== null &&
    !tournament.aurardQualifierChoiceRequired;
  const aurardPreparationCard = tournament.competitionMode === "AURARD" ? (
    <Card className="w-full flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-semibold">Préparer les rondes</h2>
      </div>
      <AurardRoundsForm
        action={saveAurardRoundsAction.bind(null, tournament.id)}
        rounds={tournament.aurardRounds}
        disabled={tournament.status !== "REGISTRATION"}
      />
      {tournament.status !== "REGISTRATION" && (
        <p className="text-[13px] text-muted">Le réglage est verrouillé car le concours a commencé.</p>
      )}
      <div className="border-t border-border pt-4">
        <h3 className="text-[17px] font-semibold">Préparer le tableau final</h3>
        <div className="mt-3">
          <AurardQualifiersForm
            action={saveAurardQualifierCountAction.bind(null, tournament.id)}
            automaticCount={bracketSizeForAurardTeamCount(teamCount)}
            selectedCount={selectedQualifierCount}
            choiceRequired={tournament.aurardQualifierChoiceRequired}
            options={AURARD_QUALIFIER_COUNTS}
            teamCount={teamCount}
            disabled={tournament.status !== "REGISTRATION"}
          />
        </div>
        <p className={`flex min-h-10 items-center justify-center text-center text-[13px] ${settingsAreSaved ? "text-success" : "text-danger"}`}>
          {settingsAreSaved ? "Réglage enregistré." : "Réglage non enregistré."}
        </p>
      </div>
    </Card>
  ) : null;
  const aurardLockedSummary = tournament.competitionMode === "AURARD" ? (
    <p className="text-center text-[15px] font-semibold text-accent">
      Réglages verrouillés : {tournament.aurardRounds ?? 2} parties · {aurardQualifierCount} équipes qualifiées
    </p>
  ) : null;

  if (tournament.competitionMode === "AURARD") {
    const scoreLabel = tournament.format === "BELOTE" ? "2 000 à 1 000" : "13 à 7";
    const aurardMinimumTeamsMessage = getDrawMinimumTeamMessage(teamCount);
    const teamName = (team: { player1: string; player2: string; player3?: string | null } | null) =>
      team ? [team.player1, team.player2, team.player3].filter(Boolean).join(" et ") : "Équipe à venir";

    if (tournament.aurardMatches.length > 0) {
      const currentRound = Math.max(...tournament.aurardMatches.map((match) => match.round));
      const currentMatches = tournament.aurardMatches.filter((match) => match.round === currentRound);
      const currentAssignedCount = new Set(currentMatches.flatMap((match) => [match.teamAId, match.teamBId].filter(Boolean))).size;
      const sourceRound = currentRound > 1 && currentAssignedCount < tournament.teams.length ? currentRound - 1 : currentRound;
      const sourceMatches = tournament.aurardMatches.filter((match) => match.round === sourceRound);
      const sourceRoundIncomplete = sourceMatches.some((match) => match.status !== "DONE");
      const completedMatches = sourceMatches.filter((match) => match.status === "DONE").length;
      const assignedToCurrent = new Set(
        (sourceRound === currentRound ? [] : currentMatches).flatMap((match) => [match.teamAId, match.teamBId].filter(Boolean)),
      );
      const completedTeamIds = new Set(sourceMatches.filter((match) => match.status === "DONE").flatMap((match) => [match.teamAId, match.teamBId].filter(Boolean)));
      const availableTeams = tournament.teams.filter((team) => completedTeamIds.has(team.id) && !assignedToCurrent.has(team.id)).length;
      const currentRoundFullyGenerated = currentAssignedCount >= tournament.teams.length;
      const allRoundsDone = aurardRoundsComplete(tournament.teams.map((team) => team.id), tournament.aurardMatches, tournament.aurardRounds);
      const canStartNextRound = !allRoundsDone && (sourceRound < currentRound || currentRoundFullyGenerated) && completedTeamIds.size >= Math.ceil(tournament.teams.length / 2) && availableTeams >= 2 && !sourceMatches.some((match) => match.status === "TO_REPLAY");
      const ranking = rankAurardTeams(
        tournament.teams.map((team) => ({ id: team.id, registrationNumber: team.registrationNumber })),
        tournament.aurardMatches,
        tournament.format === "BELOTE" ? { pointsFor: 2000, pointsAgainst: 1000 } : { pointsFor: 13, pointsAgainst: 7 },
      );
      const visibleMatches = visibleAurardMatches(tournament.aurardMatches);
      return (
        <main className="flex-1 px-6 py-10">
          <div className="max-w-3xl mx-auto flex flex-col gap-8">
            {aurardLockedSummary}
            <div className="text-center">
              <h1 className="text-3xl font-bold">Ronde {currentRound}</h1>
              <p className="text-muted mt-2">
                {tournament.aurardRounds} partie(s) prévues, avec des adversaires tirés au sort.
              </p>
              <p className="text-muted mt-1 text-sm">
                {completedMatches} résultat(s) enregistré(s) · {completedTeamIds.size}/{tournament.teams.length} équipes ont joué · la ronde suivante est proposée à partir de 50 % des inscrits.
              </p>
            </div>
            <div className="flex flex-col gap-8">
              {Array.from(new Set(tournament.aurardMatches.map((match) => match.round))).sort((a, b) => a - b).map((round) => {
                const roundMatches = tournament.aurardMatches.filter((match) => match.round === round);
                const visibleRoundMatches = visibleMatches.filter((match) => match.round === round);
                const roundDone = visibleRoundMatches.filter((match) => match.status === "DONE").length;
                const isCurrent = round === currentRound;
                return (
                  <section key={round} className="flex flex-col gap-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
                      <h2 className="text-xl font-semibold">Ronde {round}</h2>
                      <span className="text-sm text-muted">
                        {roundDone}/{visibleRoundMatches.length} résultat(s) · {visibleRoundMatches.length}/{roundMatches.length} rencontre(s) disponible(s) · {isCurrent ? "en cours" : "terminée"}
                      </span>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {visibleRoundMatches.map((match) => (
                        <Card key={match.id} className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{match.isBye ? "Dispense" : `${playingArea} ${match.tableNumber}`}</span>
                    <Badge className={match.isBye ? "border-success/50 text-success" : "border-border text-muted"}>
                      {match.isBye ? "Victoire d’office" : match.status === "DONE" ? "Joué" : "À jouer"}
                    </Badge>
                  </div>
                  {match.isBye ? (
                    <div className="text-center text-lg font-semibold">
                      <p>{teamName(match.teamA)}</p>
                      <p className="text-sm text-muted mt-2">Score attribué : {scoreLabel}</p>
                    </div>
                  ) : (
                    <ScoreForm
                      key={`${match.id}:${match.scoreA}:${match.scoreB}`}
                      action={saveAurardScoreAction.bind(null, id, match.id)}
                      teamALabel={teamName(match.teamA)}
                      teamBLabel={teamName(match.teamB)}
                      teamAId={match.teamAId}
                      teamBId={match.teamBId}
                      initialScoreA={match.scoreA}
                      initialScoreB={match.scoreB}
                      winnerSide={match.winnerId === match.teamAId ? "A" : match.winnerId === match.teamBId ? "B" : null}
                    />
                  )}
                        </Card>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
            <Card className="overflow-hidden p-0">
              <div className="p-5">
                <h2 className="text-xl font-semibold">Classement provisoire</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-border text-left text-muted">
                    <th className="px-5 py-3">#</th><th className="px-5 py-3">Équipe</th>
                    <th className="px-5 py-3 text-center">V</th><th className="px-5 py-3 text-center">Points</th>
                    <th className="px-5 py-3 text-center">Diff.</th>
                  </tr>
                </thead>
                <tbody>
                  {ranking.map((entry, index) => {
                    const team = tournament.teams.find((item) => item.id === entry.teamId);
                    return (
                      <tr key={entry.teamId} className="border-t border-border">
                        <td className="px-5 py-3 text-muted">{index + 1}</td>
                        <td className="px-5 py-3">{teamName(team ?? null)}</td>
                        <td className="px-5 py-3 text-center">{entry.wins}</td>
                        <td className="px-5 py-3 text-center">{entry.pointsFor}</td>
                        <td className="px-5 py-3 text-center">{entry.diff > 0 ? `+${entry.diff}` : entry.diff}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </Card>
            {allRoundsDone ? (
              <Card className="text-center">
                <p className="font-semibold">Les rondes sont terminées.</p>
                <p className="mt-1 text-sm text-muted">{aurardQualificationDescription(aurardQualifierCount)}</p>
              </Card>
            ) : tournament.aurardRounds !== null && currentRound >= tournament.aurardRounds && currentRoundFullyGenerated ? (
              <div className="flex flex-col items-center gap-2">
                <span className="inline-flex items-center rounded-pill border border-border bg-surface-2 px-7 py-3.5 text-[17px] font-semibold text-muted">
                  Compléter la ronde {currentRound}
                </span>
                <p className="text-sm text-muted">Saisissez les résultats restants pour terminer les rondes.</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="flex flex-wrap items-center justify-center gap-3">
                  {sourceRound < currentRound && sourceRoundIncomplete && (
                    <span className="inline-flex items-center rounded-pill border border-border bg-surface-2 px-7 py-3.5 text-[17px] font-semibold text-muted">
                      Compléter la ronde {sourceRound}
                    </span>
                  )}
                <DrawButton
                  action={startNextAurardRoundAction.bind(null, id)}
                  disabled={!canStartNextRound}
                  neutral={sourceRound < currentRound}
                  label={sourceRound === currentRound ? `Préparer la ronde ${currentRound + 1}` : `Compléter la ronde ${currentRound}`}
                />
                </div>
                {!canStartNextRound && !currentMatches.some((match) => match.status === "TO_REPLAY") && (
                  <p className="text-sm text-muted">
                    {!currentRoundFullyGenerated
                      ? `Terminez d’abord la génération de la ronde ${currentRound}.`
                      : "Saisissez au moins la moitié des résultats pour continuer."}
                  </p>
                )}
                {sourceMatches.some((match) => match.status === "TO_REPLAY") && (
                  <p className="text-sm text-danger">Une égalité doit être rejouée avant de continuer.</p>
                )}
              </div>
            )}
          </div>
        </main>
      );
    }

    return (
      <main className="flex-1 px-6 py-10">
        <div className="max-w-2xl mx-auto flex flex-col gap-8 items-center text-center">
          {aurardPreparationCard}
          <div>
            <h1 className="text-3xl font-bold">Rondes</h1>
            <p className="text-muted mt-2">{teamCount} équipe(s) inscrite(s).</p>
          </div>
          <Card className="w-full flex flex-col gap-3 text-left">
            <p className="text-[15px]">
              Chaque équipe jouera {tournament.aurardRounds ?? "2, 3 ou 4"} partie(s) contre des adversaires tirés au sort.
            </p>
            <p className="text-[15px] text-muted">
              En cas de nombre impair, une équipe reçoit une victoire d’office ({scoreLabel}). Une même équipe ne peut pas être dispensée deux fois.
            </p>
          </Card>
          {aurardMinimumTeamsMessage && <p className="text-sm text-danger">{aurardMinimumTeamsMessage}</p>}
          <DrawButton
            action={drawAurardAction.bind(null, id)}
            disabled={Boolean(aurardMinimumTeamsMessage) || !tournament.aurardRounds}
            label="Lancer la première ronde"
          />
        </div>
      </main>
    );
  }

  if (tournament.pools.length > 0) {
    return (
      <main className="flex-1 px-6 py-10">
        <div className="max-w-2xl mx-auto flex flex-col gap-6 items-center text-center">
          <h1 className="text-3xl font-bold">Tirage effectué</h1>
          <p className="text-muted">
            {tournament.pools.length} poule(s) formée(s) à partir de {teamCount} équipes.
          </p>
          <DrawButton
            action={drawPoolsAction.bind(null, id)}
            disabled
            label="Tirage effectué"
          />
          <ButtonLink href={`/tournaments/${id}/pools`}>Voir les poules</ButtonLink>
        </div>
      </main>
    );
  }

  let planPreview: { poolsOf4: number; poolsOf3: number; bracketSize: number } | null = null;
  let planError = getDrawMinimumTeamMessage(teamCount);
  if (!planError) {
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

        <DrawButton action={drawPoolsAction.bind(null, id)} disabled={Boolean(planError)} />
      </div>
    </main>
  );
}
