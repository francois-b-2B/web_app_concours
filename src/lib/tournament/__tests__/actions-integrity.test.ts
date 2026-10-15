import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const tx = {
    $queryRaw: vi.fn(),
    tournament: { findUnique: vi.fn(), update: vi.fn(), create: vi.fn() },
    pool: { count: vi.fn(), findMany: vi.fn() },
    team: { count: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), create: vi.fn(), deleteMany: vi.fn(), updateMany: vi.fn() },
    aurardMatch: { count: vi.fn(), create: vi.fn(), findMany: vi.fn() },
    bracketMatch: { findMany: vi.fn(), count: vi.fn(), update: vi.fn(), create: vi.fn() },
    poolMatch: { findFirst: vi.fn(), update: vi.fn() },
  };
  return { tx, auth: vi.fn(), transaction: vi.fn() };
});
vi.mock("@/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/prisma", () => ({ prisma: { ...mocks.tx, $transaction: mocks.transaction } }));
vi.mock("next/navigation", () => ({ notFound: () => { throw new Error("not-found"); }, redirect: (url: string) => { throw new Error("redirect:" + url); } }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { launchFinalsAction, saveBracketScoreAction } from "@/app/tournaments/[id]/bracket/actions";
import { saveMatchScoreAction } from "@/app/tournaments/[id]/pools/[letter]/actions";
import { addTeamAction, deleteTeamAction, saveAurardQualifierCountAction, updateTeamAction } from "@/app/tournaments/[id]/teams/actions";
import { createTournamentAction } from "@/app/tournaments/new/actions";
import { drawAurardAction } from "@/app/tournaments/[id]/draw/actions";

const form = (values: Record<string, string>) => {
  const data = new FormData();
  Object.entries(values).forEach(([key, value]) => data.set(key, value));
  return data;
};
const score = (extra: Record<string, string> = {}) => form({
  scoreA: "8", scoreB: "13", expectedTeamAId: "a", expectedTeamBId: "b", ...extra,
});
const bracket = () => [
  { id: "s", roundName: "SF", teamAId: "a", teamBId: "b", winnerId: "a", scoreA: 13, scoreB: 8, status: "DONE", sourceMatchAId: null, sourceMatchBId: null },
  { id: "f", roundName: "FINAL", teamAId: "a", teamBId: "c", winnerId: "a", scoreA: 13, scoreB: 9, status: "DONE", sourceMatchAId: "s", sourceMatchBId: null },
];

beforeEach(() => {
  vi.resetAllMocks();
  mocks.auth.mockResolvedValue({ user: { id: "owner" } });
  mocks.tx.$queryRaw.mockResolvedValue([{ id: "t" }]);
  mocks.transaction.mockImplementation(async (work) => work(mocks.tx));
  mocks.tx.tournament.findUnique.mockResolvedValue({ id: "t", ownerId: "owner", maxTeams: 256 });
  mocks.tx.pool.count.mockResolvedValue(0);
  mocks.tx.aurardMatch.count.mockResolvedValue(0);
  mocks.tx.bracketMatch.count.mockResolvedValue(0);
});

describe("actions serveur : intégrité sans base réelle", () => {
  it("crée un concours avec un plafond de 256 équipes", async () => {
    mocks.tx.tournament.create.mockResolvedValue({ id: "new" });
    await expect(createTournamentAction({}, form({
      name: "Concours", date: "2026-10-10", format: "BOULES", competitionMode: "AURARD",
    }))).rejects.toThrow("redirect:/tournaments/new/teams");
    expect(mocks.tx.tournament.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ maxTeams: 256 }),
    });
  });
  it("accepte la 256e inscription et refuse la 257e côté serveur", async () => {
    mocks.tx.team.count.mockResolvedValueOnce(255).mockResolvedValueOnce(256);
    mocks.tx.team.findFirst.mockResolvedValue({ registrationNumber: 255 });
    const data = form({ player1: "Alpha", player2: "Beta" });
    expect(await addTeamAction("t", {}, data)).toEqual({});
    expect(mocks.tx.team.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ registrationNumber: 256 }),
    });
    expect(await addTeamAction("t", {}, data)).toHaveProperty("error", "Le concours est limité à 256 équipes.");
    expect(mocks.tx.team.create).toHaveBeenCalledTimes(1);
  });
  it("conserve le plafond propre à un ancien concours", async () => {
    mocks.tx.tournament.findUnique.mockResolvedValue({ id: "t", ownerId: "owner", maxTeams: 128 });
    mocks.tx.team.count.mockResolvedValue(128);
    expect(await addTeamAction("t", {}, form({ player1: "Alpha", player2: "Beta" }))).toHaveProperty("error");
    expect(mocks.tx.team.create).not.toHaveBeenCalled();
  });
  it.each([4, 8, 16, 32, 64])("enregistre un choix manuel valide de %i qualifiées", async (qualifierCount) => {
    mocks.tx.tournament.findUnique.mockResolvedValue({
      id: "t", ownerId: "owner", competitionMode: "AURARD", status: "REGISTRATION",
    });
    mocks.tx.team.count.mockResolvedValue(80);
    expect(await saveAurardQualifierCountAction("t", {}, form({ aurardQualifierCount: String(qualifierCount) }))).toEqual({
      success: true, qualifierCount,
    });
  });
  it.each([8, 16, 32, 64])("refuse de qualifier toutes les %i inscrites", async (teamCount) => {
    mocks.tx.tournament.findUnique.mockResolvedValue({
      id: "t", ownerId: "owner", competitionMode: "AURARD", status: "REGISTRATION",
    });
    mocks.tx.team.count.mockResolvedValue(teamCount);
    expect(await saveAurardQualifierCountAction("t", {}, form({ aurardQualifierCount: String(teamCount) }))).toHaveProperty("error");
    expect(mocks.tx.tournament.update).not.toHaveBeenCalled();
  });
  it("signale un choix devenu invalide après le retrait d'une équipe", async () => {
    mocks.tx.tournament.findUnique.mockResolvedValue({
      id: "t", ownerId: "owner", competitionMode: "AURARD", aurardQualifierCount: 16,
    });
    mocks.tx.team.count.mockResolvedValue(16);
    await deleteTeamAction("t", "team");
    expect(mocks.tx.tournament.update).toHaveBeenCalledWith({
      where: { id: "t" },
      data: { aurardQualifierCount: null, aurardQualifierChoiceRequired: true },
    });
  });
  it("fige la proposition Aurard au lancement de la première ronde", async () => {
    mocks.tx.tournament.findUnique.mockResolvedValue({
      id: "t", ownerId: "owner", competitionMode: "AURARD", status: "REGISTRATION", format: "BOULES",
      aurardRounds: 2, aurardQualifierCount: null, aurardQualifierChoiceRequired: false,
      teams: ["a", "b", "c", "d", "e", "f"].map((id) => ({ id })), aurardMatches: [],
    });
    await expect(drawAurardAction("t", {}, new FormData())).rejects.toThrow("redirect:/tournaments/t/draw");
    expect(mocks.tx.tournament.update).toHaveBeenCalledWith({
      where: { id: "t" },
      data: { status: "POOLS_IN_PROGRESS", aurardQualifierCount: 4 },
    });
  });
  it("refuse le tableau final si une équipe n'a pas toutes ses rondes", async () => {
    mocks.tx.tournament.findUnique.mockResolvedValue({
      id: "t", ownerId: "owner", competitionMode: "AURARD", aurardRounds: 2, format: "BOULES",
    });
    mocks.tx.team.findMany.mockResolvedValue(
      ["a", "b", "c", "d", "e", "f"].map((id, index) => ({ id, registrationNumber: index + 1 })),
    );
    mocks.tx.aurardMatch.findMany.mockResolvedValue([
      { round: 1, teamAId: "a", teamBId: "b", status: "DONE" },
      { round: 1, teamAId: "c", teamBId: "d", status: "DONE" },
      { round: 1, teamAId: "e", teamBId: "f", status: "DONE" },
      { round: 2, teamAId: "a", teamBId: "c", status: "DONE" },
      { round: 2, teamAId: "b", teamBId: "d", status: "DONE" },
    ]);
    expect(await launchFinalsAction("t", {}, new FormData())).toHaveProperty("error");
    expect(mocks.tx.bracketMatch.create).not.toHaveBeenCalled();
  });
  it("laisse intact un tableau final déjà créé", async () => {
    mocks.tx.bracketMatch.count.mockResolvedValue(7);
    expect(await launchFinalsAction("t", {}, new FormData())).toHaveProperty("error", "La phase finale a déjà été lancée.");
    expect(mocks.tx.bracketMatch.create).not.toHaveBeenCalled();
  });
  it("n'écrit rien avant confirmation d'une correction destructive", async () => {
    mocks.tx.bracketMatch.findMany.mockResolvedValue(bracket());
    expect(await saveBracketScoreAction("t", "s", score())).toEqual({ confirmationRequired: true });
    expect(mocks.tx.bracketMatch.update).not.toHaveBeenCalled();
    expect(mocks.tx.tournament.update).not.toHaveBeenCalled();
  });
  it("corrige et rouvre le concours après confirmation", async () => {
    mocks.tx.bracketMatch.findMany.mockResolvedValue(bracket());
    expect(await saveBracketScoreAction("t", "s", score({ confirmReset: "yes" }))).toEqual({});
    expect(mocks.tx.bracketMatch.update).toHaveBeenCalledWith({
      where: { id: "f" }, data: { teamAId: "b", teamBId: "c", scoreA: null, scoreB: null, winnerId: null, status: "PENDING" },
    });
    expect(mocks.tx.tournament.update).toHaveBeenCalledWith({ where: { id: "t" }, data: { status: "FINALS" } });
  });
  it("remet le concours en cours si la finale devient une égalité", async () => {
    mocks.tx.bracketMatch.findMany.mockResolvedValue(bracket());
    await saveBracketScoreAction("t", "f", score({ expectedTeamBId: "c", scoreA: "13", scoreB: "13" }));
    expect(mocks.tx.tournament.update).toHaveBeenCalledWith({ where: { id: "t" }, data: { status: "FINALS" } });
  });
  it("refuse un formulaire d'un autre onglet dont les équipes ont changé", async () => {
    mocks.tx.bracketMatch.findMany.mockResolvedValue(bracket());
    expect(await saveBracketScoreAction("t", "s", score({ expectedTeamAId: "old" }))).toHaveProperty("error");
    expect(mocks.tx.bracketMatch.update).not.toHaveBeenCalled();
  });
  it.each([null, 13])("refuse les finales si un résultat est manquant ou égal : %s", async (scoreB) => {
    mocks.tx.pool.findMany.mockResolvedValue([{ teams: [], matches: [{ scoreA: 13, scoreB }] }]);
    expect(await launchFinalsAction("t", {}, new FormData())).toHaveProperty("error");
    expect(mocks.tx.bracketMatch.create).not.toHaveBeenCalled();
  });
  it("refuse de modifier une poule après lancement des finales", async () => {
    mocks.tx.bracketMatch.count.mockResolvedValue(7);
    expect(await saveMatchScoreAction("t", "m", score())).toHaveProperty("error");
    expect(mocks.tx.poolMatch.update).not.toHaveBeenCalled();
  });
  it("enregistre un résultat de poule avant les finales", async () => {
    mocks.tx.poolMatch.findFirst.mockResolvedValue({ id: "m", teamAId: "a", teamBId: "b" });
    expect(await saveMatchScoreAction("t", "m", score())).toEqual({});
    expect(mocks.tx.poolMatch.update).toHaveBeenCalledWith({
      where: { id: "m" }, data: { scoreA: 8, scoreB: 13, status: "DONE", winnerId: "b" },
    });
  });
  it("crée les finales lorsque toutes les poules sont terminées", async () => {
    const pools = ["A", "B"].map((letter, poolIndex) => {
      const teams = [0, 1, 2].map((index) => ({ id: letter + index, registrationNumber: poolIndex * 3 + index + 1 }));
      return { letter, teams, matches: [[0, 1], [0, 2], [1, 2]].map(([a, b]) => ({ teamAId: teams[a].id, teamBId: teams[b].id, scoreA: 13, scoreB: 8 })) };
    });
    mocks.tx.pool.findMany.mockResolvedValue(pools);
    let id = 0;
    mocks.tx.bracketMatch.create.mockImplementation(async ({ data }) => ({ ...data, id: String(++id) }));
    expect(await launchFinalsAction("t", {}, new FormData())).toEqual({});
    expect(mocks.tx.bracketMatch.create).toHaveBeenCalledTimes(7);
    expect(mocks.tx.tournament.update).toHaveBeenCalledWith({ where: { id: "t" }, data: { status: "FINALS" } });
  });
  it("refuse l'ajout et le retrait d'équipes après tirage, même via une requête directe", async () => {
    mocks.tx.pool.count.mockResolvedValue(2);
    expect(await addTeamAction("t", {}, form({ player1: "Alpha", player2: "Beta" }))).toHaveProperty("error");
    expect(await deleteTeamAction("t", "team")).toHaveProperty("error");
    expect(mocks.tx.team.create).not.toHaveBeenCalled();
    expect(mocks.tx.team.deleteMany).not.toHaveBeenCalled();
  });
  it("efface réellement un contact vidé dans le formulaire", async () => {
    mocks.tx.team.updateMany.mockResolvedValue({ count: 1 });
    await updateTeamAction("t", "team", {}, form({ player1: "Alpha", player2: "Beta", contact: "" }));
    expect(mocks.tx.team.updateMany).toHaveBeenCalledWith({ where: { id: "team", tournamentId: "t" }, data: { player1: "Alpha", player2: "Beta", player3: null, contact: null } });
  });
  it("refuse les écritures sans authentification", async () => {
    mocks.auth.mockResolvedValue(null);
    await expect(deleteTeamAction("t", "team")).rejects.toThrow("not-found");
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("refuse les écritures sur le concours d'un autre propriétaire", async () => {
    mocks.tx.$queryRaw.mockResolvedValue([]);
    await expect(deleteTeamAction("t", "team")).rejects.toThrow("not-found");
    expect(mocks.tx.team.deleteMany).not.toHaveBeenCalled();
    expect(mocks.tx.$queryRaw).toHaveBeenCalledWith(expect.any(Array), "t", "owner");
  });
});
