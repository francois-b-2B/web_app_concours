export interface AurardPairing {
  slotIndex: number;
  tableNumber: number | null;
  teamAId: string | null;
  teamBId: string | null;
  isBye: boolean;
  winnerId: string | null;
}

export interface AurardMatchForDraw {
  teamAId: string | null;
  teamBId: string | null;
  isBye?: boolean;
}

export interface AurardStanding {
  teamId: string;
  registrationNumber: number;
  played: number;
  wins: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
}

type RoundMatch = {
  round: number;
  teamAId: string | null;
  teamBId: string | null;
  status: string;
};

/** A generated match is shown only once both teams finished the previous round. */
export function visibleAurardMatches<T extends RoundMatch>(matches: T[]): T[] {
  const completedByRound = new Map<number, Set<string>>();
  for (const match of matches) {
    if (match.status !== "DONE") continue;
    const completed = completedByRound.get(match.round) ?? new Set<string>();
    if (match.teamAId) completed.add(match.teamAId);
    if (match.teamBId) completed.add(match.teamBId);
    completedByRound.set(match.round, completed);
  }
  return matches.filter((match) =>
    match.round === 1 ||
    (Boolean(match.teamAId) &&
      completedByRound.get(match.round - 1)?.has(match.teamAId!) === true &&
      (!match.teamBId || completedByRound.get(match.round - 1)?.has(match.teamBId) === true)),
  );
}

/** Every registered team must have exactly one completed match or bye in each planned round. */
export function aurardRoundsComplete(
  teamIds: string[],
  matches: RoundMatch[],
  plannedRounds: number | null,
): boolean {
  if (!plannedRounds || teamIds.length === 0 || matches.length === 0) return false;
  const registered = new Set(teamIds);
  if (registered.size !== teamIds.length) return false;
  const assignedByRound = new Map<number, Set<string>>();
  for (const match of matches) {
    if (match.status !== "DONE" || match.round < 1 || match.round > plannedRounds || !match.teamAId) return false;
    const assigned = assignedByRound.get(match.round) ?? new Set<string>();
    for (const id of [match.teamAId, match.teamBId]) {
      if (!id) continue;
      if (!registered.has(id) || assigned.has(id)) return false;
      assigned.add(id);
    }
    assignedByRound.set(match.round, assigned);
  }
  for (let round = 1; round <= plannedRounds; round += 1) {
    if (assignedByRound.get(round)?.size !== registered.size) return false;
  }
  return true;
}

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/** Génère la première ronde Aurard par tirage aléatoire. */
export function drawAurardRound(
  teamIds: string[],
  previousMatches: AurardMatchForDraw[] = [],
  readyTeamIds: Set<string> = new Set(teamIds),
): AurardPairing[] {
  if (teamIds.length < 2) {
    throw new Error("Il faut au moins 2 équipes pour lancer une ronde.");
  }

  const previousPairs = new Set(
    previousMatches
      .filter((match) => match.teamAId && match.teamBId)
      .map((match) => [match.teamAId!, match.teamBId!].sort().join(":")),
  );
  const previousByes = new Set(
    previousMatches.filter((match) => match.isBye && match.teamAId).map((match) => match.teamAId!),
  );
  let shuffled = shuffle(teamIds);
  let bestScore = Number.POSITIVE_INFINITY;
  for (let attempt = 0; attempt < 500; attempt += 1) {
    const candidate = attempt % 2 === 0
      ? [...shuffle(teamIds.filter((id) => readyTeamIds.has(id))), ...shuffle(teamIds.filter((id) => !readyTeamIds.has(id)))]
      : shuffle(teamIds);
    const pairs = candidate.slice(0, candidate.length - (candidate.length % 2));
    let repeats = 0;
    let readyPairs = 0;
    for (let index = 0; index < pairs.length; index += 2) {
      if (previousPairs.has([pairs[index], pairs[index + 1]].sort().join(":"))) repeats += 1;
      if (readyTeamIds.has(pairs[index]) && readyTeamIds.has(pairs[index + 1])) readyPairs += 1;
    }
    const byeTeam = candidate.length % 2 ? candidate[candidate.length - 1] : null;
    const repeatedBye = byeTeam && previousByes.has(byeTeam) && previousByes.size < teamIds.length - 1 ? 1 : 0;
    const score = repeats * 10_000 + repeatedBye * 1_000 - readyPairs;
    if (score < bestScore) {
      bestScore = score;
      shuffled = candidate;
    }
  }
  const pairings: AurardPairing[] = [];
  let tableNumber = 1;

  for (let i = 0; i < shuffled.length; i += 2) {
    const teamAId = shuffled[i];
    const teamBId = shuffled[i + 1] ?? null;
    const isBye = teamBId === null;
    pairings.push({
      slotIndex: pairings.length,
      tableNumber: isBye ? null : tableNumber++,
      teamAId,
      teamBId,
      isBye,
      winnerId: isBye ? teamAId : null,
    });
  }

  return pairings;
}

export function rankAurardTeams(
  teams: Array<{ id: string; registrationNumber: number }>,
  matches: Array<{ teamAId: string | null; teamBId: string | null; scoreA: number | null; scoreB: number | null; isBye?: boolean }>,
  byeScore: { pointsFor: number; pointsAgainst: number } = { pointsFor: 2000, pointsAgainst: 1000 },
): AurardStanding[] {
  const stats = new Map(teams.map((team) => [team.id, {
    teamId: team.id, registrationNumber: team.registrationNumber, played: 0, wins: 0,
    pointsFor: 0, pointsAgainst: 0, diff: 0,
  }]));
  for (const match of matches) {
    if (!match.teamAId) continue;
    const a = stats.get(match.teamAId);
    if (!a) continue;
    const scoreA = match.isBye ? byeScore.pointsFor : match.scoreA;
    const scoreB = match.isBye ? byeScore.pointsAgainst : match.scoreB;
    if (scoreA === null || scoreB === null) continue;
    a.played += 1;
    a.pointsFor += scoreA;
    a.pointsAgainst += scoreB;
    if (scoreA > scoreB) a.wins += 1;
    if (!match.teamBId) continue;
    const b = stats.get(match.teamBId);
    if (!b) continue;
    b.played += 1;
    b.pointsFor += scoreB;
    b.pointsAgainst += scoreA;
    if (scoreB > scoreA) b.wins += 1;
  }
  return [...stats.values()]
    .map((entry) => ({ ...entry, diff: entry.pointsFor - entry.pointsAgainst }))
    .sort((a, b) => b.wins - a.wins || b.pointsFor - a.pointsFor || b.diff - a.diff || a.registrationNumber - b.registrationNumber);
}
