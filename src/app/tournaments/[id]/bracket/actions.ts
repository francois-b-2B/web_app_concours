"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  computeGeneralStandings,
  bracketSizeForPoolCount,
  buildBracket,
  assignTableNumbers,
  type BracketRoundName,
} from "@/lib/tournament";

export interface LaunchFinalsState {
  error?: string;
}

async function requireOwnedTournament(tournamentId: string) {
  const session = await auth();
  if (!session?.user.id) notFound();

  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament || tournament.ownerId !== session.user.id) notFound();

  return tournament;
}

export async function launchFinalsAction(
  tournamentId: string,
  _prevState: LaunchFinalsState,
  _formData: FormData
): Promise<LaunchFinalsState> {
  await requireOwnedTournament(tournamentId);

  const existing = await prisma.bracketMatch.count({ where: { tournamentId } });
  if (existing > 0) {
    return { error: "La phase finale a déjà été lancée." };
  }

  const pools = await prisma.pool.findMany({
    where: { tournamentId },
    include: { teams: true, matches: true },
  });
  if (pools.length === 0) {
    return { error: "Le tirage des poules n'a pas encore été effectué." };
  }

  const registrationNumberById = new Map(
    pools.flatMap((p) => p.teams.map((t) => [t.id, t.registrationNumber] as const))
  );

  const general = computeGeneralStandings(
    pools.map((p) => ({
      letter: p.letter,
      teams: p.teams.map((t) => ({ id: t.id, registrationNumber: t.registrationNumber })),
      matches: p.matches.map((m) => ({
        teamAId: m.teamAId,
        teamBId: m.teamBId,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
      })),
    }))
  );

  const bracketSize = bracketSizeForPoolCount(pools.length);
  const qualifiers = general.slice(0, bracketSize).map((e) => ({
    id: e.teamId,
    registrationNumber: registrationNumberById.get(e.teamId) ?? 0,
  }));

  const plan = buildBracket(qualifiers, bracketSize);

  await prisma.$transaction(async (tx) => {
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
  });

  revalidatePath(`/tournaments/${tournamentId}/bracket`);
  return {};
}

async function requireOwnedBracketMatch(tournamentId: string, matchId: string) {
  const session = await auth();
  if (!session?.user.id) notFound();

  const match = await prisma.bracketMatch.findUnique({
    where: { id: matchId },
    include: { tournament: true },
  });
  if (!match || match.tournamentId !== tournamentId || match.tournament.ownerId !== session.user.id) {
    notFound();
  }

  return match;
}

export async function saveBracketScoreAction(
  tournamentId: string,
  matchId: string,
  formData: FormData
) {
  const match = await requireOwnedBracketMatch(tournamentId, matchId);
  if (!match.teamAId || !match.teamBId) return; // pas encore les deux équipes

  const rawA = formData.get("scoreA");
  const rawB = formData.get("scoreB");
  const scoreA = rawA === null || rawA === "" ? null : Number(rawA);
  const scoreB = rawB === null || rawB === "" ? null : Number(rawB);

  if (
    (scoreA !== null && (!Number.isInteger(scoreA) || scoreA < 0)) ||
    (scoreB !== null && (!Number.isInteger(scoreB) || scoreB < 0))
  ) {
    return;
  }

  let status: "PENDING" | "DONE" | "TO_REPLAY" = "PENDING";
  let winnerId: string | null = null;

  if (scoreA !== null && scoreB !== null) {
    if (scoreA > scoreB) {
      status = "DONE";
      winnerId = match.teamAId;
    } else if (scoreB > scoreA) {
      status = "DONE";
      winnerId = match.teamBId;
    } else {
      status = "TO_REPLAY";
    }
  }

  await prisma.bracketMatch.update({
    where: { id: matchId },
    data: { scoreA, scoreB, status, winnerId },
  });

  if (winnerId) {
    const nextAsA = await prisma.bracketMatch.findUnique({ where: { sourceMatchAId: matchId } });
    if (nextAsA) {
      await prisma.bracketMatch.update({ where: { id: nextAsA.id }, data: { teamAId: winnerId } });
    }
    const nextAsB = await prisma.bracketMatch.findUnique({ where: { sourceMatchBId: matchId } });
    if (nextAsB) {
      await prisma.bracketMatch.update({ where: { id: nextAsB.id }, data: { teamBId: winnerId } });
    }

    if (match.roundName === "FINAL") {
      await prisma.tournament.update({ where: { id: tournamentId }, data: { status: "DONE" } });
    }
  }

  revalidatePath(`/tournaments/${tournamentId}/bracket`);
}
