import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { createCsv, createPdf, createSpreadsheet, type TournamentExportData } from "@/lib/export/tournament-export";

function fixture(count = 0): TournamentExportData {
  return {
    id: "fictif", ownerId: "fictif", name: "Audit fictif", date: new Date("2026-10-01T12:00:00Z"),
    location: null, format: "BELOTE", teamComposition: "DOUBLETTES", competitionMode: "POOLS", aurardRounds: null,
    aurardQualifierCount: null, aurardQualifierChoiceRequired: false, maxTeams: 256, status: "REGISTRATION",
    createdAt: new Date(), updatedAt: new Date(), pools: [], bracketMatches: [],
    teams: Array.from({ length: count }, (_, i) => ({
      id: String(i), tournamentId: "fictif", registrationNumber: i + 1,
      player1: i === 0 ? "=1+1" : "Joueur " + i, player2: "Exemple", player3: null,
      contact: i === 0 ? "@SUM(1)" : null, paymentStatus: "PENDING",
      poolId: null, positionInPool: null, createdAt: new Date(), updatedAt: new Date(),
    })),
  };
}

describe("exports réels de données fictives", () => {
  it("ne crée pas une page supplémentaire en écrivant le pied de page", async () => {
    const pdf = await createPdf(fixture());
    expect(pdf.toString("latin1").match(/\/Type\s*\/Page\b/g)).toHaveLength(1);
  });
  it("génère également un PDF sur plusieurs pages", async () => {
    const pdf = await createPdf(fixture(256));
    expect((pdf.toString("latin1").match(/\/Type\s*\/Page\b/g) ?? []).length).toBeGreaterThan(1);
  });
  it("génère les cinq formats avec 256 inscriptions", async () => {
    const tournament = fixture(256);
    expect((await createPdf(tournament)).byteLength).toBeGreaterThan(0);
    expect(createCsv(tournament).toString("utf8")).toContain("Joueur 255");
    for (const format of ["xlsx", "xls", "ods"] as const) {
      const file = createSpreadsheet(tournament, format);
      expect(file.byteLength).toBeGreaterThan(0);
      const workbook = XLSX.read(file, { type: "buffer" });
      const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets["Inscriptions"], { header: 1 });
      expect(rows).toHaveLength(257);
    }
  });
  it("exporte les noms comme texte, pas comme formules CSV", () => {
    const csv = createCsv(fixture(1)).toString("utf8");
    expect(csv).toContain("'=1+1");
    expect(csv).toContain("'@SUM(1)");
    expect(csv).not.toContain(";=1+1;");
    expect(csv).toContain("Tableau final");
  });
});
