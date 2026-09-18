import { randomInt } from "node:crypto";
import type { PoolAssignment, PoolPlan, TeamRef } from "./types";

/** Mélange Fisher-Yates avec une source cryptographiquement sûre. */
function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Tirage au sort pur : mélange les équipes puis les distribue dans les
 * poules dans l'ordre du plan (poules de 4 d'abord, puis poules de 3).
 */
export function drawPools(teams: TeamRef[], plan: PoolPlan): PoolAssignment[] {
  const totalSlots = plan.pools.reduce((sum, p) => sum + p.size, 0);
  if (teams.length !== totalSlots) {
    throw new Error(
      `Le plan de poules attend ${totalSlots} équipes, mais ${teams.length} ont été fournies.`
    );
  }

  const shuffled = shuffle(teams);
  const assignments: PoolAssignment[] = [];
  let cursor = 0;

  for (const pool of plan.pools) {
    const teamIds = shuffled.slice(cursor, cursor + pool.size).map((t) => t.id);
    assignments.push({ letter: pool.letter, size: pool.size, teamIds });
    cursor += pool.size;
  }

  return assignments;
}
