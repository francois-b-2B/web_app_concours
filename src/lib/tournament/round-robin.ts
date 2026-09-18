import type { RoundRobinMatch } from "./types";

/**
 * Génère les rencontres d'une poule par la méthode du cercle (round-robin
 * générique) : un joueur fixe, les autres tournent d'une position à chaque
 * ronde. Marche pour n'importe quelle taille de poule.
 *
 * - Poule de 4 : 3 rondes, 2 matchs/ronde, chaque équipe joue 3 fois.
 * - Poule de 3 : un "bye" virtuel est ajouté pour rendre le nombre pair ;
 *   3 rondes, 1 match/ronde, chaque équipe joue 2 fois et est exempte 1 fois.
 */
export function generateRoundRobinMatches(teamIds: string[]): RoundRobinMatch[] {
  if (teamIds.length < 2) {
    throw new Error("Il faut au moins 2 équipes pour générer des rencontres.");
  }

  const ids: Array<string | null> = [...teamIds];
  if (ids.length % 2 !== 0) {
    ids.push(null); // bye
  }

  const n = ids.length;
  const rounds = n - 1;
  const half = n / 2;
  const arr = [...ids];
  const matches: RoundRobinMatch[] = [];

  for (let round = 1; round <= rounds; round++) {
    for (let i = 0; i < half; i++) {
      const a = arr[i];
      const b = arr[n - 1 - i];
      if (a !== null && b !== null) {
        matches.push({ round, teamAId: a, teamBId: b });
      }
    }
    // Rotation : la première position reste fixe, le reste tourne d'un cran.
    const fixed = arr[0];
    const rest = arr.slice(1);
    const last = rest.pop();
    if (last !== undefined) rest.unshift(last);
    arr.splice(0, arr.length, fixed, ...rest);
  }

  return matches;
}
