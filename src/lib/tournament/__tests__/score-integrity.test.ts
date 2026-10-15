import { describe, expect, it } from "vitest";
import { MAX_SCORE, planBracketScore, poolResultsComplete, scoreResult, validScore, type ScoredBracketMatch } from "../score-integrity";

function fixture(): ScoredBracketMatch[] {
  return [
    { id: "q", teamAId: "a", teamBId: "b", winnerId: "a", scoreA: 13, scoreB: 8, status: "DONE", sourceMatchAId: null, sourceMatchBId: null },
    { id: "s", teamAId: "c", teamBId: "a", winnerId: "a", scoreA: 6, scoreB: 13, status: "DONE", sourceMatchAId: "other", sourceMatchBId: "q" },
    { id: "f", teamAId: "a", teamBId: "d", winnerId: "a", scoreA: 13, scoreB: 5, status: "DONE", sourceMatchAId: "s", sourceMatchBId: "unrelated" },
    { id: "unrelated", teamAId: "d", teamBId: "e", winnerId: "d", scoreA: 13, scoreB: 9, status: "DONE", sourceMatchAId: null, sourceMatchBId: null },
  ];
}

describe("corrections du tableau final", () => {
  it("efface tous les résultats dépendants et conserve l'autre branche", () => {
    const matches = fixture();
    const before = structuredClone(matches);
    const result = planBracketScore(matches, "q", 8, 13);
    expect(result.resetsPlayedMatches).toBe(true);
    expect(result.changes.map((m) => m.id)).toEqual(["q", "s", "f"]);
    expect(result.changes[1]).toMatchObject({ teamAId: "c", teamBId: "b", scoreA: null, scoreB: null, winnerId: null, status: "PENDING" });
    expect(result.changes[2]).toMatchObject({ teamAId: null, teamBId: "d", winnerId: null, scoreA: null });
    expect(matches).toEqual(before);
  });
  it("préserve les tours suivants si seul le score change, pas le vainqueur", () => {
    const result = planBracketScore(fixture(), "q", 14, 8);
    expect(result.changes).toHaveLength(1);
    expect(result.resetsPlayedMatches).toBe(false);
  });
  it.each([[13, 13], [null, null], [13, null]])("retire le qualifié pour les scores %s / %s", (a, b) => {
    const result = planBracketScore(fixture(), "q", a, b);
    expect(result.changes[0].winnerId).toBeNull();
    expect(result.changes[1].teamBId).toBeNull();
    expect(result.changes[2].winnerId).toBeNull();
  });
  it("ne demande pas d'effacer des résultats inexistants lors d'une première saisie", () => {
    const matches = fixture().slice(0, 2);
    Object.assign(matches[0], { scoreA: null, scoreB: null, winnerId: null, status: "PENDING" });
    Object.assign(matches[1], { teamBId: null, scoreA: null, scoreB: null, winnerId: null, status: "PENDING" });
    const result = planBracketScore(matches, "q", 13, 8);
    expect(result.resetsPlayedMatches).toBe(false);
    expect(result.changes[1].teamBId).toBe("a");
  });
  it("refuse de saisir une rencontre sans ses deux équipes", () => {
    const matches = fixture();
    matches[0].teamAId = null;
    expect(() => planBracketScore(matches, "q", 13, 8)).toThrow();
  });
});

describe("validation et fin des poules", () => {
  it.each([-1, 1.5, NaN, Infinity, MAX_SCORE + 1])("refuse %s", (value) => {
    expect(validScore(value)).toBe(false);
    expect(() => scoreResult("a", "b", value, 0)).toThrow();
  });
  it("accepte les bornes et la remise à zéro d'une saisie", () => {
    expect(validScore(0)).toBe(true);
    expect(validScore(MAX_SCORE)).toBe(true);
    expect(scoreResult("a", "b", null, 1)).toEqual({ status: "PENDING", winnerId: null });
  });
  it("attend toutes les rencontres et le départage des égalités", () => {
    expect(poolResultsComplete([])).toBe(false);
    expect(poolResultsComplete([{ scoreA: 1, scoreB: null }])).toBe(false);
    expect(poolResultsComplete([{ scoreA: 13, scoreB: 13 }])).toBe(false);
    expect(poolResultsComplete([{ scoreA: 13, scoreB: 8 }, { scoreA: 0, scoreB: 13 }])).toBe(true);
  });
});
