import type { PoolPlan, PoolPlanEntry } from "./types";

/**
 * Numérote les poules comme des colonnes de tableur : A, B, ..., Z, AA, AB, ...
 * Nécessaire au-delà de 26 poules (jusqu'à 128 équipes / 3 ≈ 42 poules max).
 */
export function poolLetter(index1Based: number): string {
  let n = index1Based;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export class InvalidTeamCountError extends Error {}

/**
 * Répartition en poules : priorité aux poules de 3, complétées par des
 * poules de 4 pour absorber le reste (règle du classeur Excel d'origine).
 *
 * poulesDe4 = N mod 3
 * poulesDe3 = (N - 4 * poulesDe4) / 3
 *
 * Cette formule ne "tombe pas juste" pour N = 5 (le seul cas, pour N >= 3) :
 * poulesDe4 = 2 exigerait 8 équipes rien que pour les poules de 4. On bloque
 * ce cas explicitement plutôt que de produire un plan invalide.
 */
export function computePoolPlan(teamCount: number): PoolPlan {
  if (!Number.isInteger(teamCount) || teamCount < 3) {
    throw new InvalidTeamCountError(
      "Il faut au moins 3 équipes inscrites pour former une poule."
    );
  }

  const poolsOf4 = teamCount % 3;
  const remainder = teamCount - 4 * poolsOf4;
  const poolsOf3 = remainder / 3;

  if (!Number.isInteger(poolsOf3) || poolsOf3 < 0) {
    throw new InvalidTeamCountError(
      `${teamCount} équipes ne permettent pas de former des poules de 3 ou 4 valides. ` +
        "Attends une inscription ou un désistement de plus."
    );
  }

  const pools: PoolPlanEntry[] = [];
  let index = 1;
  for (let i = 0; i < poolsOf4; i++) {
    pools.push({ letter: poolLetter(index), size: 4 });
    index++;
  }
  for (let i = 0; i < poolsOf3; i++) {
    pools.push({ letter: poolLetter(index), size: 3 });
    index++;
  }

  return { poolsOf4, poolsOf3, pools };
}
