import type {
  GeneralStandingEntry,
  PoolMatchResult,
  TeamPoolStats,
  TeamRef,
} from "./types";

/**
 * Statistiques brutes d'une équipe dans sa poule, à partir des matchs joués
 * (score des deux côtés renseigné). Une égalité compte comme partie jouée
 * (points pour/contre inclus) mais ne crédite de victoire à personne — comme
 * dans le classeur Excel d'origine ("à la belote, on rejoue").
 */
export function computeTeamPoolStats(
  teamIds: string[],
  matches: PoolMatchResult[]
): TeamPoolStats[] {
  const stats = new Map<string, TeamPoolStats>(
    teamIds.map((id) => [
      id,
      { teamId: id, played: 0, wins: 0, pointsFor: 0, pointsAgainst: 0, diff: 0 },
    ])
  );

  for (const match of matches) {
    if (match.scoreA === null || match.scoreB === null) continue;

    const a = stats.get(match.teamAId);
    const b = stats.get(match.teamBId);
    if (!a || !b) continue;

    a.played += 1;
    b.played += 1;
    a.pointsFor += match.scoreA;
    a.pointsAgainst += match.scoreB;
    b.pointsFor += match.scoreB;
    b.pointsAgainst += match.scoreA;

    if (match.scoreA > match.scoreB) a.wins += 1;
    else if (match.scoreB > match.scoreA) b.wins += 1;
    // égalité : pas de vainqueur, on ne crédite personne
  }

  for (const s of stats.values()) {
    s.diff = s.pointsFor - s.pointsAgainst;
  }

  return [...stats.values()];
}

/**
 * Ordre de classement : victoires desc, différence desc, puis ordre
 * d'inscription (comme le comportement réel de l'Excel — la doc du projet
 * parlait de "points marqués" en 3e critère, mais ce n'est pas ce que fait
 * le classeur : il tranche silencieusement par ordre des lignes).
 */
function compareStats(
  a: TeamPoolStats,
  b: TeamPoolStats,
  registrationNumberOf: Map<string, number>
): number {
  if (b.wins !== a.wins) return b.wins - a.wins;
  if (b.diff !== a.diff) return b.diff - a.diff;
  const ra = registrationNumberOf.get(a.teamId) ?? 0;
  const rb = registrationNumberOf.get(b.teamId) ?? 0;
  return ra - rb;
}

export interface PoolStandingRow extends TeamPoolStats {
  rankInPool: number;
}

export function rankPoolStandings(
  teams: TeamRef[],
  matches: PoolMatchResult[]
): PoolStandingRow[] {
  const registrationNumberOf = new Map(teams.map((t) => [t.id, t.registrationNumber]));
  const stats = computeTeamPoolStats(
    teams.map((t) => t.id),
    matches
  );
  const sorted = [...stats].sort((a, b) => compareStats(a, b, registrationNumberOf));
  return sorted.map((s, i) => ({ ...s, rankInPool: i + 1 }));
}

export interface PoolForStandings {
  letter: string;
  teams: TeamRef[];
  matches: PoolMatchResult[];
}

/**
 * Classement général tous poules confondues : d'abord tous les 1ers de
 * poule (départagés entre eux), puis tous les 2èmes, etc. C'est cette liste,
 * tronquée à la taille du tableau final, qui donne les qualifiés (2 premiers
 * de chaque poule + repêchage des meilleurs suivants).
 */
export function computeGeneralStandings(pools: PoolForStandings[]): GeneralStandingEntry[] {
  const registrationNumberOf = new Map(
    pools.flatMap((p) => p.teams.map((t) => [t.id, t.registrationNumber] as const))
  );

  const entries: Array<GeneralStandingEntry & { _sortKey: TeamPoolStats }> = [];

  for (const pool of pools) {
    const ranked = rankPoolStandings(pool.teams, pool.matches);
    for (const row of ranked) {
      entries.push({
        ...row,
        poolLetter: pool.letter,
        rankGeneral: 0,
        _sortKey: row,
      });
    }
  }

  entries.sort((a, b) => {
    if (a.rankInPool !== b.rankInPool) return a.rankInPool - b.rankInPool;
    return compareStats(a._sortKey, b._sortKey, registrationNumberOf);
  });

  return entries.map((e, i) => {
    const { _sortKey, ...rest } = e;
    void _sortKey;
    return { ...rest, rankGeneral: i + 1 };
  });
}
