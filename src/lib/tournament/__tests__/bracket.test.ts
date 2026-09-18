import { describe, expect, it } from "vitest";
import { bracketSizeForPoolCount, standardSeeding, buildBracket } from "../bracket";

function pairsOf(seeding: number[]) {
  const pairs: string[] = [];
  for (let i = 0; i < seeding.length / 2; i++) {
    pairs.push([seeding[2 * i], seeding[2 * i + 1]].sort((a, b) => a - b).join("v"));
  }
  return pairs.sort();
}

describe("bracketSizeForPoolCount", () => {
  it("respecte le plancher de 8 et le plafond de 64", () => {
    expect(bracketSizeForPoolCount(1)).toBe(8);
    expect(bracketSizeForPoolCount(4)).toBe(8);
    expect(bracketSizeForPoolCount(5)).toBe(16);
    expect(bracketSizeForPoolCount(8)).toBe(16);
    expect(bracketSizeForPoolCount(9)).toBe(32);
    expect(bracketSizeForPoolCount(16)).toBe(32);
    expect(bracketSizeForPoolCount(17)).toBe(64);
    expect(bracketSizeForPoolCount(100)).toBe(64);
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
});
