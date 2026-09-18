"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  computePoolPlan,
  InvalidTeamCountError,
  drawPools,
  generateRoundRobinMatches,
  assignTableNumbers,
} from "@/lib/tournament";

export interface DrawState {
  error?: string;
}

async function requireOwnedTournamentWithTeams(tournamentId: string) {
  const session = await auth();
  if (!session?.user.id) notFound();

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: { teams: true, pools: true },
  });
  if (!tournament || tournament.ownerId !== session.user.id) notFound();

  return tournament;
}

export async function drawPoolsAction(
  tournamentId: string,
  _prevState: DrawState,
  _formData: FormData
): Promise<DrawState> {
  const tournament = await requireOwnedTournamentWithTeams(tournamentId);

  if (tournament.pools.length > 0) {
    return { error: "Le tirage a déjà été effectué pour ce concours." };
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

  await prisma.$transaction(async (tx) => {
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
  });

  revalidatePath(`/tournaments/${tournamentId}`);
  redirect(`/tournaments/${tournamentId}/pools`);
}
