"use server";

import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";
import { withOwnedTournament } from "@/lib/tournament/owned-transaction";
import {
  computePoolPlan,
  InvalidTeamCountError,
  drawPools,
  generateRoundRobinMatches,
  assignTableNumbers,
  getDrawMinimumTeamMessage,
} from "@/lib/tournament";
import { aurardQualifierCountForTournament, drawAurardRound, isAurardQualifierCount } from "@/lib/tournament";
import { scoreResult, validScore, type ScoreActionResult } from "@/lib/tournament/score-integrity";

export interface DrawState {
  error?: string;
}

export async function saveAurardScoreAction(
  tournamentId: string,
  matchId: string,
  formData: FormData,
): Promise<ScoreActionResult> {
  const rawA = formData.get("scoreA");
  const rawB = formData.get("scoreB");
  const scoreA = rawA === null || rawA === "" ? null : Number(rawA);
  const scoreB = rawB === null || rawB === "" ? null : Number(rawB);
  if (!validScore(scoreA) || !validScore(scoreB)) {
    return { error: "Saisissez des scores entiers positifs valides." };
  }

  const result = await withOwnedTournament(tournamentId, async (tx): Promise<ScoreActionResult> => {
    const match = await tx.aurardMatch.findFirst({ where: { id: matchId, tournamentId } });
    if (!match) notFound();
    if (match.isBye) return { error: "Cette victoire d’office ne peut pas être modifiée." };
    if (!match.teamAId || !match.teamBId) return { error: "Les deux équipes doivent être connues." };

    await tx.aurardMatch.update({
      where: { id: matchId },
      data: { scoreA, scoreB, ...scoreResult(match.teamAId, match.teamBId, scoreA, scoreB) },
    });
    return {};
  });

  if (!result.error) revalidatePath(`/tournaments/${tournamentId}/draw`);
  return result;
}

export async function startNextAurardRoundAction(
  tournamentId: string,
  _prevState: DrawState,
  _formData: FormData,
): Promise<DrawState> {
  const result = await withOwnedTournament(tournamentId, async (tx): Promise<DrawState> => {
    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
      include: { teams: true, aurardMatches: { orderBy: [{ round: "desc" }, { slotIndex: "asc" }] } },
    });
    if (!tournament) notFound();
    if (tournament.competitionMode !== "AURARD") return { error: "Ce concours n’est pas en mode Rondes." };
    if (!tournament.aurardRounds) return { error: "Choisis d’abord le nombre de parties." };
    const currentRound = tournament.aurardMatches[0]?.round ?? 0;
    const currentAssignedIds = new Set(tournament.aurardMatches.filter((match) => match.round === currentRound).flatMap((match) => [match.teamAId, match.teamBId].filter(Boolean) as string[]));
    if (currentRound >= tournament.aurardRounds && currentAssignedIds.size >= tournament.teams.length) return { error: "Toutes les rondes prévues sont générées." };
    const sourceRound = currentRound > 1 && currentAssignedIds.size < tournament.teams.length
      ? currentRound - 1
      : currentRound;
    const sourceMatches = tournament.aurardMatches.filter((match) => match.round === sourceRound);
    if (sourceRound === currentRound && currentAssignedIds.size < tournament.teams.length) {
      return { error: "Terminez d’abord la génération de la ronde en cours." };
    }
    const completedTeamIds = new Set(
      sourceMatches.filter((match) => match.status === "DONE").flatMap((match) => [match.teamAId, match.teamBId].filter(Boolean) as string[]),
    );
    if (completedTeamIds.size < Math.ceil(tournament.teams.length / 2)) {
      return { error: "Saisissez au moins la moitié des résultats avant de lancer la ronde suivante." };
    }
    if (sourceMatches.some((match) => match.status === "TO_REPLAY")) {
      return { error: "Une égalité doit être rejouée avant de continuer." };
    }
    const nextRound = sourceRound + 1;
    const existingNext = tournament.aurardMatches.filter((match) => match.round === nextRound);
    const alreadyAssigned = new Set(existingNext.flatMap((match) => [match.teamAId, match.teamBId].filter(Boolean) as string[]));
    let availableTeamIds = existingNext.length === 0
      ? tournament.teams.map((team) => team.id)
      : tournament.teams.map((team) => team.id).filter((teamId) => completedTeamIds.has(teamId) && !alreadyAssigned.has(teamId));
    // Tant que la ronde précédente n'est pas complète, on garde un nombre pair d'équipes.
    if (existingNext.length > 0 && sourceMatches.some((match) => match.status !== "DONE") && availableTeamIds.length % 2 === 1) {
      availableTeamIds = availableTeamIds.slice(0, -1);
    }
    if (availableTeamIds.length < 2) return { error: "Aucune nouvelle rencontre ne peut encore être préparée." };
    const pairings = drawAurardRound(
      availableTeamIds,
      tournament.aurardMatches,
      completedTeamIds,
    );
    for (const pairing of pairings) {
      await tx.aurardMatch.create({
        data: {
          tournamentId,
          round: nextRound,
          slotIndex: existingNext.length + pairing.slotIndex,
          tableNumber: pairing.tableNumber === null ? null : existingNext.length + pairing.tableNumber,
          teamAId: pairing.teamAId,
          teamBId: pairing.teamBId,
          status: pairing.isBye ? "DONE" : "PENDING",
          winnerId: pairing.winnerId,
          isBye: pairing.isBye,
          ...(pairing.isBye
            ? tournament.format === "BELOTE"
              ? { scoreA: 2000, scoreB: 1000 }
              : { scoreA: 13, scoreB: 7 }
            : {}),
        },
      });
    }
    return {};
  });
  if (result.error) return result;
  revalidatePath(`/tournaments/${tournamentId}/draw`);
  revalidatePath(`/tournaments/${tournamentId}/standings`);
  return redirect(`/tournaments/${tournamentId}/draw`);
}

export async function drawAurardAction(
  tournamentId: string,
  _prevState: DrawState,
  _formData: FormData,
): Promise<DrawState> {
  const result = await withOwnedTournament(tournamentId, async (tx): Promise<DrawState> => {
    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
      include: { teams: true, aurardMatches: true },
    });
    if (!tournament) notFound();
    if (tournament.competitionMode !== "AURARD") return { error: "Ce concours n’est pas en mode Rondes." };
    if (tournament.aurardMatches.length > 0) return { error: "La première ronde a déjà été lancée." };
    if (tournament.status !== "REGISTRATION") return { error: "Le concours a déjà commencé." };
    if (!tournament.aurardRounds) return { error: "Choisis d’abord 2, 3 ou 4 parties dans les inscriptions." };
    const minimumTeamsMessage = getDrawMinimumTeamMessage(tournament.teams.length);
    if (minimumTeamsMessage) return { error: minimumTeamsMessage };
    if (tournament.aurardQualifierChoiceRequired) {
      return { error: "Choisis à nouveau la taille du tableau final avant de lancer la première ronde." };
    }
    if (
      tournament.aurardQualifierCount !== null &&
      (!isAurardQualifierCount(tournament.aurardQualifierCount) ||
        tournament.aurardQualifierCount >= tournament.teams.length)
    ) {
      return { error: "Choisis à nouveau la taille du tableau final avant de lancer la première ronde." };
    }
    const qualifierCount = aurardQualifierCountForTournament({
      teamCount: tournament.teams.length,
      savedCount: tournament.aurardQualifierCount,
      hasStarted: false,
    });

    const pairings = drawAurardRound(tournament.teams.map((team) => team.id));
    for (const pairing of pairings) {
      await tx.aurardMatch.create({
        data: {
          tournamentId,
          round: 1,
          slotIndex: pairing.slotIndex,
          tableNumber: pairing.tableNumber,
          teamAId: pairing.teamAId,
          teamBId: pairing.teamBId,
          status: pairing.isBye ? "DONE" : "PENDING",
          winnerId: pairing.winnerId,
          isBye: pairing.isBye,
          ...(pairing.isBye
            ? tournament.format === "BELOTE"
              ? { scoreA: 2000, scoreB: 1000 }
              : { scoreA: 13, scoreB: 7 }
            : {}),
        },
      });
    }

    await tx.tournament.update({
      where: { id: tournamentId },
      data: { status: "POOLS_IN_PROGRESS", aurardQualifierCount: qualifierCount },
    });
    return {};
  });

  if (result.error) return result;
  revalidatePath(`/tournaments/${tournamentId}/draw`);
  revalidatePath(`/tournaments/${tournamentId}/teams`);
  return redirect(`/tournaments/${tournamentId}/draw`);
}

export async function drawPoolsAction(
  tournamentId: string,
  _prevState: DrawState,
  _formData: FormData
): Promise<DrawState> {
  const result = await withOwnedTournament(tournamentId, async (tx): Promise<DrawState> => {
    const tournament = await tx.tournament.findUnique({ where: { id: tournamentId }, include: { teams: true, pools: true } });
    if (!tournament) notFound();

    if (tournament.pools.length > 0) {
      return { error: "Le tirage a déjà été effectué pour ce concours." };
    }

    const minimumTeamsMessage = getDrawMinimumTeamMessage(tournament.teams.length);
    if (minimumTeamsMessage) {
      return { error: minimumTeamsMessage };
    }

    let plan;
    try {
      plan = computePoolPlan(tournament.teams.length);
    } catch (err) {
      if (err instanceof InvalidTeamCountError) {
        return { error: err.message };
      }
      throw err;
    }

    const assignments = drawPools(
      tournament.teams.map((t) => ({ id: t.id, registrationNumber: t.registrationNumber })),
      plan
    );


    // 1. Créer les poules et y assigner les équipes.
    const poolIdByLetter = new Map<string, string>();
    for (const assignment of assignments) {
      const pool = await tx.pool.create({
        data: { tournamentId, letter: assignment.letter, size: assignment.size },
      });
      poolIdByLetter.set(assignment.letter, pool.id);

      for (let i = 0; i < assignment.teamIds.length; i++) {
        await tx.team.update({
          where: { id: assignment.teamIds[i] },
          data: { poolId: pool.id, positionInPool: i + 1 },
        });
      }
    }

    // 2. Générer les rencontres (round-robin) de chaque poule.
    const createdMatchesByRound = new Map<number, string[]>();
    for (const assignment of assignments) {
      const poolId = poolIdByLetter.get(assignment.letter)!;
      const matches = generateRoundRobinMatches(assignment.teamIds);
      for (const match of matches) {
        const created = await tx.poolMatch.create({
          data: {
            poolId,
            round: match.round,
            teamAId: match.teamAId,
            teamBId: match.teamBId,
          },
        });
        const list = createdMatchesByRound.get(match.round) ?? [];
        list.push(created.id);
        createdMatchesByRound.set(match.round, list);
      }
    }

    // 3. Numéroter les tables : les tables repartent de 1 à chaque ronde.
    for (const [, matchIds] of createdMatchesByRound) {
      const tableByMatchId = assignTableNumbers(matchIds);
      for (const [matchId, tableNumber] of tableByMatchId) {
        await tx.poolMatch.update({ where: { id: matchId }, data: { tableNumber } });
      }
    }

    await tx.tournament.update({
      where: { id: tournamentId },
      data: { status: "POOLS_IN_PROGRESS" },
    });
    return {};
  });
  if (result.error) return result;

  revalidatePath(`/tournaments/${tournamentId}`);
  redirect(`/tournaments/${tournamentId}/pools`);
}
