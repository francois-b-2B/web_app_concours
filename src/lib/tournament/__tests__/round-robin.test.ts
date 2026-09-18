import { describe, expect, it } from "vitest";
import { generateRoundRobinMatches } from "../round-robin";

function countAppearances(matches: { teamAId: string; teamBId: string }[]) {
  const counts = new Map<string, number>();
  for (const m of matches) {
    counts.set(m.teamAId, (counts.get(m.teamAId) ?? 0) + 1);
    counts.set(m.teamBId, (counts.get(m.teamBId) ?? 0) + 1);
  }
  return counts;
}

describe("generateRoundRobinMatches", () => {
  it("poule de 4 : 6 matchs sur 3 rondes, chaque équipe joue 3 fois", () => {
    const matches = generateRoundRobinMatches(["A", "B", "C", "D"]);
    expect(matches).toHaveLength(6);
    expect(new Set(matches.map((m) => m.round)).size).toBe(3);
    for (const count of countAppearances(matches).values()) {
      expect(count).toBe(3);
    }
    // 2 matchs par ronde
    for (let round = 1; round <= 3; round++) {
      expect(matches.filter((m) => m.round === round)).toHaveLength(2);
    }
  });

  it("poule de 3 : 3 matchs sur 3 rondes, chaque équipe joue 2 fois (1 exempt par ronde)", () => {
    const matches = generateRoundRobinMatches(["A", "B", "C"]);
    expect(matches).toHaveLength(3);
    expect(new Set(matches.map((m) => m.round)).size).toBe(3);
    for (const count of countAppearances(matches).values()) {
      expect(count).toBe(2);
    }
    for (let round = 1; round <= 3; round++) {
      expect(matches.filter((m) => m.round === round)).toHaveLength(1);
    }
  });

  it("aucune paire ne se répète", () => {
    const matches = generateRoundRobinMatches(["A", "B", "C", "D", "E"]);
    const pairs = matches.map((m) => [m.teamAId, m.teamBId].sort().join("-"));
    expect(new Set(pairs).size).toBe(pairs.length);
  });
});
