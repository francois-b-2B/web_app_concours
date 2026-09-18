import type { BracketMatchPlan, BracketRoundName, TeamRef } from "./types";

const ROUND_NAMES_BY_SIZE: Record<number, BracketRoundName[]> = {
  8: ["QF", "SF", "FINAL"],
  16: ["R16", "QF", "SF", "FINAL"],
  32: ["R32", "R16", "QF", "SF", "FINAL"],
  64: ["R64", "R32", "R16", "QF", "SF", "FINAL"],
};

/**
 * Taille du tableau final : la plus petite puissance de 2 supérieure ou
 * égale à 2 x (nombre de poules), plafonnée à 64, plancher à 8. Plus il y a
 * de poules (donc d'équipes), plus le tableau final est grand.
 */
export function bracketSizeForPoolCount(poolCount: number): 8 | 16 | 32 | 64 {
  let size = 8;
  while (size < poolCount * 2 && size < 64) size *= 2;
  return size as 8 | 16 | 32 | 64;
}

export function roundsForSize(size: 8 | 16 | 32 | 64): BracketRoundName[] {
  return ROUND_NAMES_BY_SIZE[size];
}

/**
 * Ordre de seeding sportif standard : place les têtes de série pour
 * qu'elles ne se rencontrent que le plus tard possible dans le tableau
 * (1 contre 16, 8 contre 9, etc. pour un tableau de 16).
 */
export function standardSeeding(size: number): number[] {
  let seeds = [1, 2];
  while (seeds.length < size) {
    const n = seeds.length * 2;
    const next: number[] = [];
    for (const s of seeds) {
      next.push(s);
      next.push(n + 1 - s);
    }
    seeds = next;
  }
  return seeds;
}

/**
 * Construit tous les matchs du tableau final, tour par tour, à partir des
 * qualifiés triés du meilleur au moins bon (classement général). Les byes
 * (quand il n'y a pas assez de qualifiés pour remplir le tableau) sont
 * attribués aux mieux classés et propagés automatiquement au tour suivant.
 */
export function buildBracket(
  qualifiers: TeamRef[],
  bracketSize: 8 | 16 | 32 | 64
): BracketMatchPlan[] {
  const seedOrder = standardSeeding(bracketSize);
  const rounds = roundsForSize(bracketSize);
  const plans: BracketMatchPlan[] = [];

  const round1Name = rounds[0];
  const round1: BracketMatchPlan[] = [];
  for (let i = 0; i < bracketSize / 2; i++) {
    const seedA = seedOrder[2 * i];
    const seedB = seedOrder[2 * i + 1];
    const teamA = qualifiers[seedA - 1] ?? null;
    const teamB = qualifiers[seedB - 1] ?? null;
    const isBye = teamA === null ? teamB !== null : teamB === null;
    const winnerId = isBye ? (teamA ? teamA.id : teamB!.id) : null;

    round1.push({
      roundName: round1Name,
      slotIndex: i,
      teamAId: teamA?.id ?? null,
      teamBId: teamB?.id ?? null,
      isBye,
      winnerId,
      sourceSlotA: null,
      sourceSlotB: null,
      sourceRoundA: null,
      sourceRoundB: null,
    });
  }
  plans.push(...round1);

  let prevRound = round1;
  let prevRoundName = round1Name;

  for (let r = 1; r < rounds.length; r++) {
    const roundName = rounds[r];
    const count = prevRound.length / 2;
    const thisRound: BracketMatchPlan[] = [];

    for (let i = 0; i < count; i++) {
      const feederA = prevRound[2 * i];
      const feederB = prevRound[2 * i + 1];

      thisRound.push({
        roundName,
        slotIndex: i,
        teamAId: feederA.isBye ? feederA.winnerId : null,
        teamBId: feederB.isBye ? feederB.winnerId : null,
        isBye: false,
        winnerId: null,
        sourceSlotA: feederA.slotIndex,
        sourceSlotB: feederB.slotIndex,
        sourceRoundA: prevRoundName,
        sourceRoundB: prevRoundName,
      });
    }

    plans.push(...thisRound);
    prevRound = thisRound;
    prevRoundName = roundName;
  }

  return plans;
}
