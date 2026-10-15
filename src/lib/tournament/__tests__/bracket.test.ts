import { describe, expect, it } from "vitest";
import {
  aurardBracketOverview,
  aurardQualifierCountForTournament,
  availableAurardQualifierCounts,
  bracketSizeForAurardTeamCount,
  bracketSizeForPoolCount,
  standardSeeding,
  buildBracket,
} from "../bracket";

function pairsOf(seeding: number[]) {
  const pairs: string[] = [];
  for (let i = 0; i < seeding.length / 2; i++) {
    pairs.push([seeding[2 * i], seeding[2 * i + 1]].sort((a, b) => a - b).join("v"));
  }
  return pairs.sort();
}

describe("bracketSizeForPoolCount", () => {
  it("conserve huit places pour le tableau final, quel que soit le nombre de poules", () => {
    expect(bracketSizeForPoolCount(1)).toBe(8);
    expect(bracketSizeForPoolCount(4)).toBe(8);
    expect(bracketSizeForPoolCount(16)).toBe(8);
    expect(bracketSizeForPoolCount(100)).toBe(8);
  });
});

describe("qualification Aurard", () => {
  it.each([
    [15, 4], [16, 8], [32, 8], [33, 16], [64, 16], [65, 32], [128, 32], [129, 64], [200, 64], [256, 64],
  ] as const)("propose %i qualifiées pour %i inscrites", (teamCount, expected) => {
    expect(bracketSizeForAurardTeamCount(teamCount)).toBe(expected);
  });

  it("n'offre que les tableaux strictement inférieurs aux inscriptions", () => {
    expect(availableAurardQualifierCounts(8)).toEqual([4]);
    expect(availableAurardQualifierCounts(9)).toEqual([4, 8]);
    expect(availableAurardQualifierCounts(16)).toEqual([4, 8]);
    expect(availableAurardQualifierCounts(17)).toEqual([4, 8, 16]);
    expect(availableAurardQualifierCounts(64)).toEqual([4, 8, 16, 32]);
    expect(availableAurardQualifierCounts(65)).toEqual([4, 8, 16, 32, 64]);
  });

  it("conserve la règle historique d'un concours déjà commencé sans choix enregistré", () => {
    expect(aurardQualifierCountForTournament({ teamCount: 9, savedCount: null, hasStarted: true })).toBe(8);
    expect(aurardQualifierCountForTournament({ teamCount: 15, savedCount: null, hasStarted: true })).toBe(8);
    expect(aurardQualifierCountForTournament({ teamCount: 15, savedCount: null, hasStarted: false })).toBe(4);
  });

  it("conserve un choix manuel valide puis revient à la proposition s'il ne l'est plus", () => {
    expect(aurardQualifierCountForTournament({ teamCount: 80, savedCount: 64, hasStarted: false })).toBe(64);
    expect(aurardQualifierCountForTournament({ teamCount: 64, savedCount: 64, hasStarted: false })).toBe(16);
  });

  it("décrit les tableaux de 32 et 64 places", () => {
    expect(aurardBracketOverview(32)).toEqual({ firstRound: "Seizièmes de finale", firstRoundMatches: 16, totalMatches: 31 });
    expect(aurardBracketOverview(64)).toEqual({ firstRound: "Trente-deuxièmes de finale", firstRoundMatches: 32, totalMatches: 63 });
  });
});

describe("standardSeeding", () => {
  it("reproduit exactement les paires de l'Excel pour un tableau de 8", () => {
    expect(pairsOf(standardSeeding(8))).toEqual(["1v8", "2v7", "3v6", "4v5"].sort());
  });

  it("reproduit exactement les paires de l'Excel pour un tableau de 16", () => {
    expect(pairsOf(standardSeeding(16))).toEqual(
      ["1v16", "8v9", "5v12", "4v13", "6v11", "3v14", "7v10", "2v15"].sort()
    );
  });
});

describe("buildBracket", () => {
  const qualifiers = Array.from({ length: 5 }, (_, i) => ({
    id: `t${i + 1}`,
    registrationNumber: i + 1,
  }));

  it("attribue les byes aux mieux classés quand les qualifiés ne remplissent pas le tableau", () => {
    const bracket = buildBracket(qualifiers, 8);
    const round1 = bracket.filter((m) => m.roundName === "QF");
    expect(round1).toHaveLength(4);

    const byes = round1.filter((m) => m.isBye);
    expect(byes).toHaveLength(3); // 8 - 5 = 3 places vides

    // les 5 premiers qualifiés (t1..t5) sont bien ceux qui jouent ou byes ; jamais de place vide pour eux
    for (const q of qualifiers) {
      const match = round1.find((m) => m.teamAId === q.id || m.teamBId === q.id);
      expect(match).toBeDefined();
    }
  });

  it("propage le vainqueur d'un bye au tour suivant", () => {
    const bracket = buildBracket(qualifiers, 8);
    const round1 = bracket.filter((m) => m.roundName === "QF");
    const sf = bracket.filter((m) => m.roundName === "SF");

    for (const byeMatch of round1.filter((m) => m.isBye)) {
      const nextSlot = Math.floor(byeMatch.slotIndex / 2);
      const feedingSf = sf.find((m) => m.slotIndex === nextSlot);
      expect(feedingSf).toBeDefined();
      const hasWinner =
        feedingSf!.teamAId === byeMatch.winnerId || feedingSf!.teamBId === byeMatch.winnerId;
      expect(hasWinner).toBe(true);
    }
  });

  it("construit tous les tours attendus pour un tableau de 16", () => {
    const qualifiers16 = Array.from({ length: 16 }, (_, i) => ({
      id: `t${i + 1}`,
      registrationNumber: i + 1,
    }));
    const bracket = buildBracket(qualifiers16, 16);
    const roundNames = new Set(bracket.map((m) => m.roundName));
    expect(roundNames).toEqual(new Set(["R16", "QF", "SF", "FINAL"]));
    expect(bracket.filter((m) => m.roundName === "R16")).toHaveLength(8);
    expect(bracket.filter((m) => m.roundName === "FINAL")).toHaveLength(1);
    // tableau complet -> aucun bye
    expect(bracket.filter((m) => m.isBye)).toHaveLength(0);
  });

  it.each([
    [32, "R32", 16, 31],
    [64, "R64", 32, 63],
  ] as const)("construit le bon premier tour pour %i qualifiées", (size, firstRound, firstRoundMatches, totalMatches) => {
    const ranked = Array.from({ length: size }, (_, i) => ({ id: `q${i + 1}`, registrationNumber: i + 1 }));
    const bracket = buildBracket(ranked, size);
    expect(bracket.filter((match) => match.roundName === firstRound)).toHaveLength(firstRoundMatches);
    expect(bracket).toHaveLength(totalMatches);
    const qualifiedIds = new Set(ranked.map((team) => team.id));
    const firstRoundIds = new Set(bracket
      .filter((match) => match.roundName === firstRound)
      .flatMap((match) => [match.teamAId, match.teamBId])
      .filter((id): id is string => id !== null));
    expect(firstRoundIds).toEqual(qualifiedIds);
  });
});
