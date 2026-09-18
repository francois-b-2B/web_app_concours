export interface TeamRef {
  id: string;
  registrationNumber: number;
}

export interface PoolPlanEntry {
  letter: string;
  size: 3 | 4;
}

export interface PoolPlan {
  poolsOf4: number;
  poolsOf3: number;
  pools: PoolPlanEntry[];
}

export interface PoolAssignment {
  letter: string;
  size: 3 | 4;
  teamIds: string[];
}

export interface RoundRobinMatch {
  round: number;
  teamAId: string;
  teamBId: string;
}

export interface PoolMatchResult {
  teamAId: string;
  teamBId: string;
  scoreA: number | null;
  scoreB: number | null;
}

export interface TeamPoolStats {
  teamId: string;
  played: number;
  wins: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
}

export interface GeneralStandingEntry extends TeamPoolStats {
  poolLetter: string;
  rankInPool: number;
  rankGeneral: number;
}

export type BracketRoundName = "R64" | "R32" | "R16" | "QF" | "SF" | "FINAL";

export interface BracketMatchPlan {
  roundName: BracketRoundName;
  slotIndex: number;
  teamAId: string | null;
  teamBId: string | null;
  isBye: boolean;
  winnerId: string | null;
  sourceSlotA: number | null;
  sourceSlotB: number | null;
  sourceRoundA: BracketRoundName | null;
  sourceRoundB: BracketRoundName | null;
}
