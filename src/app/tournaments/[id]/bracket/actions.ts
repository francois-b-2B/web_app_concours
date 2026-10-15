"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { withOwnedTournament } from "@/lib/tournament/owned-transaction";
import { planBracketScore, poolResultsComplete, FINALS_WAIT_MESSAGE, validScore, type ScoreActionResult } from "@/lib/tournament/score-integrity";
import {
  computeGeneralStandings,
  aurardQualifierCountForTournament,
  rankAurardTeams,
  bracketSizeForPoolCount,
  buildBracket,
  assignTableNumbers,
  aurardRoundsComplete,
  type BracketRoundName,
} from "@/lib/tournament";

export interface LaunchFinalsState {
  error?: string;
}

export async function launchFinalsAction(
  tournamentId: string,
  _prevState: LaunchFinalsState,
  _formData: FormData
): Promise<LaunchFinalsState> {
  const result = await withOwnedTournament(tournamentId, async (tx): Promise<LaunchFinalsState> => {

    const existing = await tx.bracketMatch.count({ where: { tournamentId } });
    if (existing > 0) {
      return { error: "La phase finale a déjà été lancée." };
    }

    const tournament = await tx.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) notFound();

    let bracketSize: 4 | 8 | 16 | 32 | 64 = 8;
    let qualifiers: Array<{ id: string; registrationNumber: number }>;
    if (tournament.competitionMode === "AURARD") {
      const teams = await tx.team.findMany({ where: { tournamentId }, orderBy: { registrationNumber: "asc" } });
      const matches = await tx.aurardMatch.findMany({ where: { tournamentId } });
      if (!tournament.aurardRounds || matches.length === 0) return { error: "Les rondes n'ont pas encore été lancées." };
      if (!aurardRoundsComplete(teams.map((team) => team.id), matches, tournament.aurardRounds)) {
        return { error: "Terminez toutes les rondes avant de lancer le tableau final." };
      }
      const ranking = rankAurardTeams(
        teams.map((team) => ({ id: team.id, registrationNumber: team.registrationNumber })),
        matches,
        tournament.format === "BELOTE" ? { pointsFor: 2000, pointsAgainst: 1000 } : { pointsFor: 13, pointsAgainst: 7 },
      );
      bracketSize = aurardQualifierCountForTournament({
        teamCount: teams.length,
        savedCount: tournament.aurardQualifierCount,
        hasStarted: tournament.status !== "REGISTRATION",
      });
      qualifiers = ranking.slice(0, bracketSize).map((entry) => ({
        id: entry.teamId,
        registrationNumber: entry.registrationNumber,
      }));
    } else {
      const pools = await tx.pool.findMany({ where: { tournamentId }, include: { teams: true, matches: true } });
      if (pools.length === 0) return { error: "Le tirage des poules n'a pas encore été effectué." };
      if (!pools.every((pool) => poolResultsComplete(pool.matches))) return { error: FINALS_WAIT_MESSAGE };
      const registrationNumberById = new Map(pools.flatMap((p) => p.teams.map((t) => [t.id, t.registrationNumber] as const)));
      const general = computeGeneralStandings(pools.map((p) => ({
        letter: p.letter,
        teams: p.teams.map((t) => ({ id: t.id, registrationNumber: t.registrationNumber })),
        matches: p.matches.map((m) => ({ teamAId: m.teamAId, teamBId: m.teamBId, scoreA: m.scoreA, scoreB: m.scoreB })),
      })));
      bracketSize = bracketSizeForPoolCount(pools.length);
      qualifiers = general.slice(0, bracketSize).map((e) => ({ id: e.teamId, registrationNumber: registrationNumberById.get(e.teamId) ?? 0 }));
    }

    const plan = buildBracket(qualifiers, bracketSize);


    const idByRoundSlot = new Map<string, string>();
    const matchesByRound = new Map<BracketRoundName, string[]>();

    // Les plans sont déjà dans l'ordre des tours (round1 en premier), donc
    // les sources d'un tour ont toujours été créées avant.
    for (const m of plan) {
      const sourceMatchAId =
        m.sourceRoundA && m.sourceSlotA !== null
          ? idByRoundSlot.get(`${m.sourceRoundA}:${m.sourceSlotA}`)
          : undefined;
      const sourceMatchBId =
        m.sourceRoundB && m.sourceSlotB !== null
          ? idByRoundSlot.get(`${m.sourceRoundB}:${m.sourceSlotB}`)
          : undefined;

      const created = await tx.bracketMatch.create({
        data: {
          tournamentId,
          roundName: m.roundName,
          slotIndex: m.slotIndex,
          teamAId: m.teamAId,
          teamBId: m.teamBId,
          isBye: m.isBye,
          winnerId: m.winnerId,
          status: m.isBye ? "DONE" : "PENDING",
          sourceMatchAId,
          sourceMatchBId,
        },
      });

      idByRoundSlot.set(`${m.roundName}:${m.slotIndex}`, created.id);
      if (!m.isBye) {
        const list = matchesByRound.get(m.roundName) ?? [];
        list.push(created.id);
        matchesByRound.set(m.roundName, list);
      }
    }

    for (const [, matchIds] of matchesByRound) {
      const tableByMatchId = assignTableNumbers(matchIds);
      for (const [matchId, tableNumber] of tableByMatchId) {
        await tx.bracketMatch.update({ where: { id: matchId }, data: { tableNumber } });
      }
    }

    await tx.tournament.update({ where: { id: tournamentId }, data: { status: "FINALS" } });
    return {};
  });

  revalidatePath(`/tournaments/${tournamentId}`, "layout");
  return result;
}

export async function saveBracketScoreAction(
  tournamentId: string,
  matchId: string,
  formData: FormData,
): Promise<ScoreActionResult> {
  const rawA = formData.get("scoreA");
  const rawB = formData.get("scoreB");
  const scoreA = rawA === null || rawA === "" ? null : Number(rawA);
  const scoreB = rawB === null || rawB === "" ? null : Number(rawB);
  if (!validScore(scoreA) || !validScore(scoreB)) return { error: "Saisissez des scores entiers positifs valides." };

  const result = await withOwnedTournament(tournamentId, async (tx): Promise<ScoreActionResult> => {
    const matches = await tx.bracketMatch.findMany({ where: { tournamentId } });
    const match = matches.find((item) => item.id === matchId);
    if (!match) notFound();
    if (!match.teamAId || !match.teamBId) return { error: "Les deux équipes doivent être connues." };
    if (formData.get("expectedTeamAId") !== match.teamAId || formData.get("expectedTeamBId") !== match.teamBId) {
      return { error: "Les équipes de cette rencontre ont changé. Rechargez la page avant de saisir le score." };
    }
    const plan = planBracketScore(matches, matchId, scoreA, scoreB);
    if (plan.resetsPlayedMatches && formData.get("confirmReset") !== "yes") return { confirmationRequired: true };
    for (const changed of plan.changes) {
      const { teamAId, teamBId, scoreA, scoreB, winnerId, status } = changed;
      await tx.bracketMatch.update({ where: { id: changed.id }, data: { teamAId, teamBId, scoreA, scoreB, winnerId, status } });
    }
    const final = matches.find((item) => item.roundName === "FINAL");
    const updatedFinal = plan.changes.find((item) => item.id === final?.id) ?? final;
    await tx.tournament.update({ where: { id: tournamentId }, data: { status: updatedFinal?.winnerId ? "DONE" : "FINALS" } });
    return {};
  });
  if (!result.error && !result.confirmationRequired) {
    revalidatePath(`/tournaments/${tournamentId}`, "layout");
    revalidatePath(`/public/tournaments/${tournamentId}`);
    revalidatePath("/dashboard");
  }
  return result;
}
