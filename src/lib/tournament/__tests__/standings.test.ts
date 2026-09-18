import { describe, expect, it } from "vitest";
import { rankPoolStandings, computeGeneralStandings } from "../standings";

const teams = [
  { id: "t1", registrationNumber: 1 },
  { id: "t2", registrationNumber: 2 },
  { id: "t3", registrationNumber: 3 },
  { id: "t4", registrationNumber: 4 },
];

const matches = [
  { teamAId: "t1", teamBId: "t2", scoreA: 2000, scoreB: 1500 },
  { teamAId: "t3", teamBId: "t4", scoreA: 2000, scoreB: 1000 },
  { teamAId: "t1", teamBId: "t3", scoreA: 2000, scoreB: 1800 },
  { teamAId: "t2", teamBId: "t4", scoreA: 2000, scoreB: 1200 },
  { teamAId: "t1", teamBId: "t4", scoreA: 2000, scoreB: 1300 },
  { teamAId: "t2", teamBId: "t3", scoreA: 1500, scoreB: 1500 }, // égalité : à rejouer
];

describe("rankPoolStandings", () => {
  it("classe par victoires puis différence de points", () => {
    const ranked = rankPoolStandings(teams, matches);
    expect(ranked.map((r) => r.teamId)).toEqual(["t1", "t3", "t2", "t4"]);
    expect(ranked[0].wins).toBe(3);
  });

  it("une égalité compte comme partie jouée mais ne crédite personne", () => {
    const ranked = rankPoolStandings(teams, matches);
    const t2 = ranked.find((r) => r.teamId === "t2")!;
    const t3 = ranked.find((r) => r.teamId === "t3")!;
    expect(t2.played).toBe(3);
    expect(t3.played).toBe(3);
    expect(t2.wins + t3.wins).toBeLessThan(t2.played); // pas de vainqueur sur le match nul
  });

  it("les scores manquants (match non joué) ne comptent pas", () => {
    const partial = matches.slice(0, 2);
    const ranked = rankPoolStandings(teams, partial);
    const t4 = ranked.find((r) => r.teamId === "t4")!;
    expect(t4.played).toBe(1);
  });
});

describe("computeGeneralStandings", () => {
  it("classe d'abord tous les 1ers de poule, puis tous les 2èmes, etc.", () => {
    const poolA = {
      letter: "A",
      teams: teams,
      matches,
    };
    const poolB = {
      letter: "B",
      teams: [
        { id: "u1", registrationNumber: 5 },
        { id: "u2", registrationNumber: 6 },
        { id: "u3", registrationNumber: 7 },
      ],
      matches: [
        { teamAId: "u1", teamBId: "u2", scoreA: 2000, scoreB: 1000 },
        { teamAId: "u1", teamBId: "u3", scoreA: 2000, scoreB: 1500 },
        { teamAId: "u2", teamBId: "u3", scoreA: 1800, scoreB: 1200 },
      ],
    };

    const general = computeGeneralStandings([poolA, poolB]);
    const rank1Entries = general.filter((e) => e.rankInPool === 1);
    const rank2Entries = general.filter((e) => e.rankInPool === 2);

    // tous les rangs 1 de poule doivent précéder tous les rangs 2
    const lastRank1Index = Math.max(...rank1Entries.map((e) => general.indexOf(e)));
    const firstRank2Index = Math.min(...rank2Entries.map((e) => general.indexOf(e)));
    expect(lastRank1Index).toBeLessThan(firstRank2Index);

    expect(general[0].teamId).toBeDefined();
    expect(general.map((e) => e.rankGeneral)).toEqual(
      Array.from({ length: general.length }, (_, i) => i + 1)
    );
  });
});
