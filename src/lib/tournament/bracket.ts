import type { BracketMatchPlan, BracketRoundName, TeamRef } from "./types";

export const AURARD_QUALIFIER_COUNTS = [4, 8, 16, 32, 64] as const;
export type AurardQualifierCount = (typeof AURARD_QUALIFIER_COUNTS)[number];

const ROUND_NAMES_BY_SIZE: Record<number, BracketRoundName[]> = {
  4: ["SF", "FINAL"],
  8: ["QF", "SF", "FINAL"],
  16: ["R16", "QF", "SF", "FINAL"],
  32: ["R32", "R16", "QF", "SF", "FINAL"],
  64: ["R64", "R32", "R16", "QF", "SF", "FINAL"],
};

/**
 * Chaque concours se termine par un tableau fixe de huit places : quarts,
 * demi-finales et finale. Le nombre de poules ne change pas ce format.
 */
export function bracketSizeForPoolCount(_poolCount: number): 8 {
  return 8;
}

export function bracketSizeForAurardTeamCount(teamCount: number): AurardQualifierCount {
  if (teamCount <= 15) return 4;
  if (teamCount <= 32) return 8;
  if (teamCount <= 64) return 16;
  if (teamCount <= 128) return 32;
  return 64;
}

export function legacyAurardQualifierCount(teamCount: number): 4 | 8 {
  return teamCount <= 8 ? 4 : 8;
}

export function isAurardQualifierCount(value: number): value is AurardQualifierCount {
  return AURARD_QUALIFIER_COUNTS.includes(value as AurardQualifierCount);
}

export function availableAurardQualifierCounts(teamCount: number): AurardQualifierCount[] {
  return AURARD_QUALIFIER_COUNTS.filter((count) => count < teamCount);
}

export function aurardQualifierCountForTournament({
  teamCount,
  savedCount,
  hasStarted,
}: {
  teamCount: number;
  savedCount: number | null;
  hasStarted: boolean;
}): AurardQualifierCount {
  if (savedCount !== null && isAurardQualifierCount(savedCount) && savedCount < teamCount) {
    return savedCount;
  }
  return hasStarted ? legacyAurardQualifierCount(teamCount) : bracketSizeForAurardTeamCount(teamCount);
}

export function aurardQualificationDescription(qualifierCount: AurardQualifierCount): string {
  const firstRound = roundsForSize(qualifierCount)[0];
  const label: Record<BracketRoundName, string> = {
    R64: "trente-deuxièmes de finale",
    R32: "seizièmes de finale",
    R16: "huitièmes de finale",
    QF: "quarts de finale",
    SF: "demi-finales",
    FINAL: "finale",
  };
  return `Les ${qualifierCount} premières équipes du classement des rondes accéderont aux ${label[firstRound]}.`;
}

export function aurardBracketOverview(qualifierCount: AurardQualifierCount) {
  const firstRound = roundsForSize(qualifierCount)[0];
  const labels: Record<BracketRoundName, string> = {
    R64: "Trente-deuxièmes de finale",
    R32: "Seizièmes de finale",
    R16: "Huitièmes de finale",
    QF: "Quarts de finale",
    SF: "Demi-finales",
    FINAL: "Finale",
  };
  return {
    firstRound: labels[firstRound],
    firstRoundMatches: qualifierCount / 2,
    totalMatches: qualifierCount - 1,
  };
}

export function roundsForSize(size: 4 | 8 | 16 | 32 | 64): BracketRoundName[] {
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
  bracketSize: 4 | 8 | 16 | 32 | 64
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

export const QUALIFICATION_DESCRIPTION = "Les 8 premières équipes du classement général se qualifient pour les quarts de finale.";
