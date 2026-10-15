export const MAX_SCORE = 2_147_483_647;
export const REGISTRATION_LOCK_MESSAGE = "Le tirage est effectué : l’ajout et le retrait d’équipes sont fermés. Les noms, contacts et paiements restent modifiables.";
export const POOL_SCORE_LOCK_MESSAGE = "La phase finale est lancée : les résultats des poules ne peuvent plus être modifiés.";
export const FINALS_WAIT_MESSAGE = "Terminez tous les matchs des poules, y compris les égalités à rejouer, avant de lancer la phase finale.";
export const RESET_RESULTS_MESSAGE = "Cette correction change une qualification. Les résultats des rencontres suivantes qui en dépendent seront effacés et devront être saisis à nouveau. Continuer ?";

export type ScoreActionResult = { error?: string; confirmationRequired?: boolean };

export function validScore(score: number | null) {
  return score === null || (Number.isInteger(score) && score >= 0 && score <= MAX_SCORE);
}

export function scoreResult(teamAId: string | null, teamBId: string | null, scoreA: number | null, scoreB: number | null) {
  if (!validScore(scoreA) || !validScore(scoreB)) throw new Error("Score invalide.");
  if (scoreA === null || scoreB === null) return { status: "PENDING" as const, winnerId: null };
  if (scoreA === scoreB) return { status: "TO_REPLAY" as const, winnerId: null };
  return { status: "DONE" as const, winnerId: scoreA > scoreB ? teamAId : teamBId };
}

export function poolResultsComplete(matches: Array<{ scoreA: number | null; scoreB: number | null }>) {
  return matches.length > 0 && matches.every(({ scoreA, scoreB }) =>
    scoreA !== null && scoreB !== null && validScore(scoreA) && validScore(scoreB) && scoreA !== scoreB);
}

export interface ScoredBracketMatch {
  id: string;
  teamAId: string | null;
  teamBId: string | null;
  sourceMatchAId: string | null;
  sourceMatchBId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  winnerId: string | null;
  status: "PENDING" | "DONE" | "TO_REPLAY";
}

/** Change only the affected branch. A score correction with the same winner
 * leaves later results intact; a changed qualifier invalidates descendants. */
export function planBracketScore<T extends ScoredBracketMatch>(
  matches: T[], matchId: string, scoreA: number | null, scoreB: number | null,
) {
  const match = matches.find((item) => item.id === matchId);
  if (!match?.teamAId || !match.teamBId) throw new Error("Les deux équipes doivent être connues.");
  const updated = { ...match, scoreA, scoreB, ...scoreResult(match.teamAId, match.teamBId, scoreA, scoreB) };
  const changes = new Map<string, T>([[matchId, updated]]);
  const queue = match.winnerId !== updated.winnerId ? [updated] : [];
  let resetsPlayedMatches = false;
  while (queue.length) {
    const source = queue.shift()!;
    for (const original of matches) {
      const side = original.sourceMatchAId === source.id ? "teamAId"
        : original.sourceMatchBId === source.id ? "teamBId" : null;
      if (!side) continue;
      const next = changes.get(original.id) ?? original;
      if (next[side] === source.winnerId) continue;
      resetsPlayedMatches ||= next.scoreA !== null || next.scoreB !== null;
      const cleared = { ...next, [side]: source.winnerId, scoreA: null, scoreB: null, winnerId: null, status: "PENDING" as const };
      changes.set(next.id, cleared);
      // Propagate even if a previously inconsistent node had no winner.
      queue.push(cleared);
    }
  }
  return { changes: [...changes.values()], resetsPlayedMatches };
}
