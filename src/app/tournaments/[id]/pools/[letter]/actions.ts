"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { withOwnedTournament } from "@/lib/tournament/owned-transaction";
import { POOL_SCORE_LOCK_MESSAGE, scoreResult, validScore, type ScoreActionResult } from "@/lib/tournament/score-integrity";

export async function saveMatchScoreAction(tournamentId: string, matchId: string, formData: FormData): Promise<ScoreActionResult> {
  const rawA = formData.get("scoreA");
  const rawB = formData.get("scoreB");
  const scoreA = rawA === null || rawA === "" ? null : Number(rawA);
  const scoreB = rawB === null || rawB === "" ? null : Number(rawB);
  if (!validScore(scoreA) || !validScore(scoreB)) return { error: "Saisissez des scores entiers positifs valides." };
  const result = await withOwnedTournament(tournamentId, async (tx): Promise<ScoreActionResult> => {
    if (await tx.bracketMatch.count({ where: { tournamentId } })) return { error: POOL_SCORE_LOCK_MESSAGE };
    const match = await tx.poolMatch.findFirst({ where: { id: matchId, pool: { tournamentId } } });
    if (!match) notFound();
    await tx.poolMatch.update({ where: { id: matchId }, data: { scoreA, scoreB, ...scoreResult(match.teamAId, match.teamBId, scoreA, scoreB) } });
    return {};
  });
  if (!result.error) {
    revalidatePath(`/tournaments/${tournamentId}`, "layout");
    revalidatePath(`/public/tournaments/${tournamentId}`);
  }
  return result;
}
