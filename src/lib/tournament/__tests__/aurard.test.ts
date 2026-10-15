import { describe, expect, it } from "vitest";
import { aurardRoundsComplete, drawAurardRound, visibleAurardMatches } from "@/lib/tournament/aurard";

describe("drawAurardRound", () => {
  it("crée une rencontre par paire et une dispense si nécessaire", () => {
    const pairings = drawAurardRound(["a", "b", "c", "d", "e"]);

    expect(pairings).toHaveLength(3);
    expect(pairings.filter((pairing) => pairing.isBye)).toHaveLength(1);
    expect(new Set(pairings.flatMap((pairing) => [pairing.teamAId, pairing.teamBId]).filter(Boolean))).toEqual(
      new Set(["a", "b", "c", "d", "e"]),
    );
    expect(pairings.filter((pairing) => !pairing.isBye).map((pairing) => pairing.tableNumber)).toEqual([1, 2]);
  });

  it("refuse de lancer une ronde sans deux équipes", () => {
    expect(() => drawAurardRound(["a"])).toThrow();
  });

  it.each([255, 256])("attribue exactement une place à chacune des %i équipes", (count) => {
    const ids = Array.from({ length: count }, (_, index) => String(index));
    const pairings = drawAurardRound(ids);
    expect(pairings).toHaveLength(Math.ceil(count / 2));
    expect(pairings.filter((pairing) => pairing.isBye)).toHaveLength(count % 2);
    expect(pairings.filter((pairing) => !pairing.isBye)).toHaveLength(Math.floor(count / 2));
    expect(pairings.flatMap((pairing) => [pairing.teamAId, pairing.teamBId].filter(Boolean)).sort()).toEqual([...ids].sort());
    const secondRound = drawAurardRound(ids, pairings);
    expect(secondRound.filter((pairing) => pairing.isBye)).toHaveLength(count % 2);
    if (count % 2) {
      expect(secondRound.find((pairing) => pairing.isBye)?.teamAId).not.toBe(pairings.find((pairing) => pairing.isBye)?.teamAId);
    }
  });
});

describe("progression des rondes", () => {
  const teams = ["a", "b", "c", "d"];
  const match = (round: number, teamAId: string, teamBId: string, status = "DONE") =>
    ({ round, teamAId, teamBId, status });

  it("masque une rencontre anticipée tant que les deux équipes n'ont pas fini la ronde précédente", () => {
    const matches = [
      match(1, "a", "b"),
      match(1, "c", "d", "PENDING"),
      match(2, "a", "c", "PENDING"),
      match(2, "b", "d", "PENDING"),
    ];
    expect(visibleAurardMatches(matches)).toEqual(matches.slice(0, 2));
    matches[1].status = "DONE";
    expect(visibleAurardMatches(matches)).toEqual(matches);
  });

  it("n'autorise pas le tableau final si une équipe manque une ronde, même si tous les matchs créés sont terminés", () => {
    const incomplete = [
      match(1, "a", "b"), match(1, "c", "d"),
      match(2, "a", "b"),
    ];
    expect(aurardRoundsComplete(teams, incomplete, 2)).toBe(false);
    expect(aurardRoundsComplete(teams, [...incomplete, match(2, "c", "d")], 2)).toBe(true);
    expect(aurardRoundsComplete(teams, [...incomplete, match(2, "a", "d")], 2)).toBe(false);
  });
});
