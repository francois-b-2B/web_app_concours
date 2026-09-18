"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireOwnedMatch(tournamentId: string, matchId: string) {
  const session = await auth();
  if (!session?.user.id) notFound();

  const match = await prisma.poolMatch.findUnique({
    where: { id: matchId },
    include: { pool: { include: { tournament: true } } },
  });
  if (
    !match ||
    match.pool.tournamentId !== tournamentId ||
    match.pool.tournament.ownerId !== session.user.id
  ) {
    notFound();
  }

  return match;
}

export async function saveMatchScoreAction(
  tournamentId: string,
  matchId: string,
  formData: FormData
) {
  const match = await requireOwnedMatch(tournamentId, matchId);

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

  await prisma.poolMatch.update({
    where: { id: matchId },
    data: { scoreA, scoreB, status, winnerId },
  });

  const pool = await prisma.pool.findUnique({ where: { id: match.poolId } });
  revalidatePath(`/tournaments/${tournamentId}/pools/${pool?.letter}`);
  revalidatePath(`/tournaments/${tournamentId}/standings`);
}
