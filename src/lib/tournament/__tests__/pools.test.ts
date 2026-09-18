import { describe, expect, it } from "vitest";
import { computePoolPlan, InvalidTeamCountError, poolLetter } from "../pools";

describe("computePoolPlan", () => {
  const cases: Array<[number, number, number]> = [
    [3, 0, 1],
    [4, 1, 0],
    [6, 0, 2],
    [7, 1, 1],
    [8, 2, 0],
    [9, 0, 3],
    [10, 1, 2],
    [11, 2, 1],
    [12, 0, 4],
    [128, 128 % 3, (128 - 4 * (128 % 3)) / 3],
  ];

  it.each(cases)("N=%i -> %i poules de 4, %i poules de 3", (n, expected4, expected3) => {
    const plan = computePoolPlan(n);
    expect(plan.poolsOf4).toBe(expected4);
    expect(plan.poolsOf3).toBe(expected3);
    expect(plan.pools.reduce((sum, p) => sum + p.size, 0)).toBe(n);
  });

  it("place les poules de 4 avant les poules de 3", () => {
    const plan = computePoolPlan(7); // 1 poule de 4, 1 poule de 3
    expect(plan.pools.map((p) => p.size)).toEqual([4, 3]);
  });

  it("rejette N < 3", () => {
    expect(() => computePoolPlan(2)).toThrow(InvalidTeamCountError);
    expect(() => computePoolPlan(0)).toThrow(InvalidTeamCountError);
  });

  it("rejette N=5 (le seul N>=3 où la règle ne tombe pas juste)", () => {
    expect(() => computePoolPlan(5)).toThrow(InvalidTeamCountError);
  });

  it("génère des lettres au-delà de Z pour les grands concours", () => {
    const plan = computePoolPlan(128);
    expect(plan.pools.length).toBeGreaterThan(26);
    expect(plan.pools[26].letter).toBe("AA");
  });
});

describe("poolLetter", () => {
  it("suit la numérotation type colonnes de tableur", () => {
    expect(poolLetter(1)).toBe("A");
    expect(poolLetter(26)).toBe("Z");
    expect(poolLetter(27)).toBe("AA");
    expect(poolLetter(28)).toBe("AB");
    expect(poolLetter(52)).toBe("AZ");
  });
});
