import PDFDocument from "pdfkit";
import * as XLSX from "xlsx";
import type { Prisma } from "@prisma/client";
import {
  bracketSizeForPoolCount,
  computeGeneralStandings,
  aurardQualifierCountForTournament,
  aurardRoundsComplete,
  playingAreaLabel,
  rankAurardTeams,
  rankPoolStandings,
  visibleAurardMatches,
} from "@/lib/tournament";

export const tournamentExportInclude = {
  teams: { orderBy: { registrationNumber: "asc" } },
  pools: {
    orderBy: { letter: "asc" },
    include: {
      teams: { orderBy: { positionInPool: "asc" } },
      matches: {
        orderBy: [{ round: "asc" }, { tableNumber: "asc" }],
        include: { teamA: true, teamB: true },
      },
    },
  },
  aurardMatches: {
    orderBy: [{ round: "asc" }, { slotIndex: "asc" }],
    include: { teamA: true, teamB: true },
  },
  bracketMatches: {
    orderBy: [{ slotIndex: "asc" }],
    include: { teamA: true, teamB: true },
  },
} satisfies Prisma.TournamentInclude;

type TournamentExportPayload = Prisma.TournamentGetPayload<{
  include: typeof tournamentExportInclude;
}>;
export type TournamentExportData = Omit<TournamentExportPayload, "aurardMatches"> & {
  aurardMatches?: TournamentExportPayload["aurardMatches"];
};

const paymentLabels = { PAID: "Réglée", PENDING: "En attente" } as const;
const statusLabels = { PENDING: "À jouer", DONE: "Joué", TO_REPLAY: "À rejouer" } as const;
const roundLabels = {
  R64: "32èmes de finale",
  R32: "16èmes de finale",
  R16: "Huitièmes de finale",
  QF: "Quarts de finale",
  SF: "Demi-finales",
  FINAL: "Finale",
} as const;

const bracketRoundOrder = ["R64", "R32", "R16", "QF", "SF", "FINAL"] as const;

function teamLabel(tournament: TournamentExportData) {
  return tournament.teamComposition === "TRIPLETTES" ? "Triplette" : "Doublette";
}

function sportLabel(tournament: TournamentExportData) {
  return tournament.format === "BELOTE" ? "Belote" : "Boules";
}

function byeScore(tournament: TournamentExportData) {
  return tournament.format === "BELOTE" ? { for: 2000, against: 1000 } : { for: 13, against: 7 };
}

function playingArea(tournament: TournamentExportData) {
  return playingAreaLabel(tournament.format);
}

function matchScoreLabel(tournament: TournamentExportData, match: { scoreA: number | null; scoreB: number | null; isBye?: boolean }) {
  if (match.isBye) {
    const score = byeScore(tournament);
    return `${score.for} - ${score.against}`;
  }
  return match.scoreA === null || match.scoreB === null ? "—" : `${match.scoreA} - ${match.scoreB}`;
}

function aurardStandingsData(tournament: TournamentExportData) {
  return rankAurardTeams(
    tournament.teams.map((team) => ({ id: team.id, registrationNumber: team.registrationNumber })),
    (tournament.aurardMatches ?? []).map((match) => ({
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      scoreA: match.scoreA,
      scoreB: match.scoreB,
      status: match.status,
      isBye: match.isBye,
    })),
    { pointsFor: byeScore(tournament).for, pointsAgainst: byeScore(tournament).against }
  );
}

function orderedBracketMatches(tournament: TournamentExportData) {
  return tournament.bracketMatches
    .map((match, index) => ({ match, index }))
    .sort((a, b) => {
      const roundDifference =
        bracketRoundOrder.indexOf(a.match.roundName) - bracketRoundOrder.indexOf(b.match.roundName);
      return roundDifference || a.index - b.index;
    })
    .map(({ match }) => match);
}

function teamName(team: { player1: string; player2: string; player3?: string | null } | null) {
  return team
    ? [team.player1, team.player2, team.player3].filter(Boolean).join(" et ")
    : "En attente";
}

function standingsData(tournament: TournamentExportData) {
  const pools = tournament.pools.map((pool) => ({
    letter: pool.letter,
    teams: pool.teams.map((team) => ({
      id: team.id,
      registrationNumber: team.registrationNumber,
    })),
    matches: pool.matches.map((match) => ({
      teamAId: match.teamAId,
      teamBId: match.teamBId,
      scoreA: match.scoreA,
      scoreB: match.scoreB,
    })),
  }));
  return computeGeneralStandings(pools);
}

function qualifiedCountFor(tournament: TournamentExportData) {
  return tournament.competitionMode === "AURARD"
    ? aurardQualifierCountForTournament({
        teamCount: tournament.teams.length,
        savedCount: tournament.aurardQualifierCount,
        hasStarted: tournament.status !== "REGISTRATION",
      })
    : Math.min(bracketSizeForPoolCount(tournament.pools.length), tournament.teams.length);
}

function aurardQualificationsAreFinal(tournament: TournamentExportData) {
  return tournament.competitionMode === "AURARD" && aurardRoundsComplete(
    tournament.teams.map((team) => team.id),
    tournament.aurardMatches ?? [],
    tournament.aurardRounds,
  );
}

function workbookFor(tournament: TournamentExportData) {
  const workbook = XLSX.utils.book_new();
  const names = new Map(tournament.teams.map((team) => [team.id, teamName(team)]));
  const orderedBracket = orderedBracketMatches(tournament);
  const qualifiedCount = qualifiedCountFor(tournament);
  const aurardQualificationsFinal = aurardQualificationsAreFinal(tournament);
  const standings = standingsData(tournament);

  const addSheet = (name: string, rows: unknown[][], widths: number[]) => {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = widths.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(workbook, sheet, name);
  };

  addSheet(
    "Résumé",
    [
      ["Concours", tournament.name],
      ["Date", tournament.date.toLocaleDateString("fr-FR")],
      ["Lieu", tournament.location ?? ""],
      ["Type", sportLabel(tournament)],
      ["Composition", teamLabel(tournament)],
      ["Format", tournament.competitionMode === "AURARD" ? "Rondes + tableau final" : "Poules + tableau final"],
      ["Nombre d’équipes", tournament.teams.length],
      ["Équipes qualifiées", qualifiedCount],
      ["Nombre de poules", tournament.competitionMode === "AURARD" ? "—" : tournament.pools.length],
      ["Exporté le", new Date().toLocaleString("fr-FR")],
    ],
    [24, 48]
  );

  addSheet(
    "Inscriptions",
    tournament.competitionMode === "AURARD"
      ? [
          ["N°", "Joueur 1", "Joueur 2", "Joueur 3", "Contact", "Règlement"],
          ...tournament.teams.map((team) => [team.registrationNumber, team.player1, team.player2, team.player3 ?? "", team.contact ?? "", paymentLabels[team.paymentStatus]]),
        ]
      : [
          ["N°", "Joueur 1", "Joueur 2", "Joueur 3", "Contact", "Règlement", "Poule"],
          ...tournament.teams.map((team) => [team.registrationNumber, team.player1, team.player2, team.player3 ?? "", team.contact ?? "", paymentLabels[team.paymentStatus], tournament.pools.find((pool) => pool.id === team.poolId)?.letter ?? ""]),
        ],
    tournament.competitionMode === "AURARD" ? [7, 24, 24, 24, 28, 14] : [7, 24, 24, 24, 28, 14, 9]
  );

  if (tournament.competitionMode === "AURARD") {
    addSheet("Rondes", [
      ["Ronde", playingArea(tournament), "Équipe A", "Score A", "Équipe B", "Score B", "Statut"],
      ...visibleAurardMatches(tournament.aurardMatches ?? []).map((match) => [
        match.round, match.tableNumber ?? "—", teamName(match.teamA), match.scoreA ?? "",
        teamName(match.teamB), match.scoreB ?? "", match.isBye ? "Victoire d’office" : statusLabels[match.status],
      ]),
    ], [9, 9, 38, 10, 38, 10, 18]);
  } else {
    addSheet("Poules", [
      ["Poule", "Position", "N°", teamLabel(tournament)],
      ...tournament.pools.flatMap((pool) => pool.teams.map((team) => [pool.letter, team.positionInPool ?? "", team.registrationNumber, teamName(team)])),
    ], [9, 10, 7, 40]);
  }

  if (tournament.competitionMode === "POOLS") addSheet(
    "Matchs des poules",
    [
      ["Poule", "Tour", playingArea(tournament), "Équipe A", "Score A", "Équipe B", "Score B", "Statut"],
      ...tournament.pools.flatMap((pool) =>
        pool.matches.map((match) => [
          pool.letter,
          match.round,
          match.tableNumber ?? "",
          teamName(match.teamA),
          match.scoreA ?? "",
          teamName(match.teamB),
          match.scoreB ?? "",
          statusLabels[match.status],
        ])
      ),
    ],
    [9, 8, 9, 38, 10, 38, 10, 14]
  );

  const aurardStandings = tournament.competitionMode === "AURARD" ? aurardStandingsData(tournament) : [];

  addSheet(
    "Classement",
    [
      ["Général", teamLabel(tournament), "Poule", "Rang poule", "Joués", "Victoires", "Pour", "Contre", "Différence", "Qualifiée"],
      ...(tournament.competitionMode === "AURARD" ? aurardStandings.map((row, index) => [
        index + 1,
        names.get(row.teamId) ?? "",
        "—", "—", row.played, row.wins, row.pointsFor, row.pointsAgainst, row.diff,
        aurardQualificationsFinal && index < qualifiedCount ? "Oui" : "Non",
      ]) : standings.map((row) => [
        row.rankGeneral,
        names.get(row.teamId) ?? "",
        row.poolLetter,
        row.rankInPool,
        row.played,
        row.wins,
        row.pointsFor,
        row.pointsAgainst,
        row.diff,
        row.rankGeneral <= qualifiedCount ? "Oui" : "Non",
      ])),
    ],
    [10, 40, 9, 12, 9, 11, 10, 10, 12, 12]
  );

  addSheet(
    "Tableau final",
    [
      ["Tour", "Match", playingArea(tournament), "Équipe A", "Score A", "Équipe B", "Score B", "Statut"],
      ...orderedBracket.map((match) => [
        roundLabels[match.roundName],
        match.slotIndex + 1,
        match.tableNumber ?? "",
        teamName(match.teamA),
        match.isBye ? byeScore(tournament).for : (match.scoreA ?? ""),
        teamName(match.teamB),
        match.isBye ? byeScore(tournament).against : (match.scoreB ?? ""),
        match.isBye ? "Qualifiée d’office" : statusLabels[match.status],
      ]),
    ],
    [22, 9, 9, 38, 10, 38, 10, 18]
  );

  return workbook;
}

export function createSpreadsheet(
  tournament: TournamentExportData,
  format: "xlsx" | "xls" | "ods"
) {
  return XLSX.write(workbookFor(tournament), { type: "buffer", bookType: format });
}

export function createCsv(tournament: TournamentExportData) {
  const workbook = workbookFor(tournament);
  const sections = workbook.SheetNames.map((name) => {
    const sheet = workbook.Sheets[name];
    // CSV does not preserve typed text cells: prevent names/contacts becoming formulas.
    for (const [address, cell] of Object.entries(sheet)) {
      if (address.startsWith("!") || cell.t !== "s" || typeof cell.v !== "string") continue;
      if (/^\s*[=+@-]|^[\t\r\n]/.test(cell.v)) {
        cell.v = "'" + cell.v;
        delete cell.w;
      }
    }
    const csv = XLSX.utils.sheet_to_csv(sheet, { FS: ";" });
    return `### ${name}\n${csv}`;
  });
  return Buffer.from(`\uFEFF${sections.join("\n\n")}`, "utf8");
}

type PdfRow = string[];

export function createPdf(tournament: TournamentExportData): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const document = new PDFDocument({ size: "A4", margin: 42, bufferPages: true });
    const chunks: Buffer[] = [];
    document.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    document.on("end", () => resolve(Buffer.concat(chunks)));
    document.on("error", reject);

    const pageWidth = 511;
    const ensureSpace = (height = 50) => {
      if (document.y + height > 790) document.addPage();
    };
    const section = (title: string) => {
      ensureSpace(55);
      document
        .moveDown(0.7)
        .font("Helvetica-Bold")
        .fontSize(15)
        .fillColor("#0a6fd6")
        .text(title, 42, document.y, { width: pageWidth });
      document.moveDown(0.35);
    };
    const table = (headers: string[], rows: PdfRow[], widths: number[]) => {
      const drawRow = (values: string[], bold = false, fill = false) => {
        const height = Math.max(
          24,
          ...values.map((value, index) =>
            document.heightOfString(value, { width: widths[index] - 10, lineGap: 1 }) + 10
          )
        );
        ensureSpace(height);
        const y = document.y;
        if (fill) document.save().rect(42, y, pageWidth, height).fill("#eaf3ff").restore();
        let x = 42;
        values.forEach((value, index) => {
          document
            .font(bold ? "Helvetica-Bold" : "Helvetica")
            .fontSize(8.5)
            .fillColor("#111827")
            .text(value, x + 5, y + 5, { width: widths[index] - 10, lineGap: 1 });
          x += widths[index];
        });
        document.y = y + height;
        document.moveTo(42, document.y).lineTo(42 + pageWidth, document.y).strokeColor("#d1d5db").stroke();
      };
      drawRow(headers, true, true);
      rows.forEach((row) => drawRow(row));
    };

    document.font("Helvetica-Bold").fontSize(24).fillColor("#111827").text(tournament.name);
    document
      .moveDown(0.25)
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#4b5563")
      .text(
        [
          `${sportLabel(tournament)} • ${teamLabel(tournament)}`,
          tournament.date.toLocaleDateString("fr-FR"),
          tournament.location,
          `${tournament.teams.length} équipe${tournament.teams.length > 1 ? "s" : ""}`,
        ]
          .filter(Boolean)
          .join(" • ")
      );

    section("Inscriptions");
    table(
      tournament.competitionMode === "AURARD" ? ["N°", "Joueur 1", "Joueur 2", "Joueur 3", "Règlement"] : ["N°", "Joueur 1", "Joueur 2", "Joueur 3", "Règlement", "Poule"],
      tournament.teams.map((team) => tournament.competitionMode === "AURARD"
        ? [String(team.registrationNumber), team.player1, team.player2, team.player3 ?? "", paymentLabels[team.paymentStatus]]
        : [String(team.registrationNumber), team.player1, team.player2, team.player3 ?? "", paymentLabels[team.paymentStatus], tournament.pools.find((pool) => pool.id === team.poolId)?.letter ?? "—"]),
      tournament.competitionMode === "AURARD" ? [30, 140, 140, 115, 86] : [30, 125, 125, 100, 76, 55]
    );

    if (tournament.competitionMode === "AURARD") {
      section("Rondes");
      table(
        ["Ronde", playingArea(tournament), "Rencontre", "Score", "Statut"],
        visibleAurardMatches(tournament.aurardMatches ?? []).map((match) => [
          String(match.round),
          match.tableNumber ? String(match.tableNumber) : "—",
          `${teamName(match.teamA)} / ${teamName(match.teamB)}`,
          matchScoreLabel(tournament, match),
          match.isBye ? "Victoire d’office" : statusLabels[match.status],
        ]),
        [45, 45, 250, 76, 95]
      );
    }

    for (const pool of tournament.pools) {
      section(`Poule ${pool.letter}`);
      const ranked = rankPoolStandings(
        pool.teams.map((team) => ({ id: team.id, registrationNumber: team.registrationNumber })),
        pool.matches.map((match) => ({
          teamAId: match.teamAId,
          teamBId: match.teamBId,
          scoreA: match.scoreA,
          scoreB: match.scoreB,
        }))
      );
      const names = new Map(pool.teams.map((team) => [team.id, teamName(team)]));
      table(
        ["Rang", teamLabel(tournament), "J", "V", "Pour", "Contre", "Diff."],
        ranked.map((row) => [
          String(row.rankInPool),
          names.get(row.teamId) ?? "",
          String(row.played),
          String(row.wins),
          String(row.pointsFor),
          String(row.pointsAgainst),
          row.diff > 0 ? `+${row.diff}` : String(row.diff),
        ]),
        [38, 221, 42, 42, 56, 56, 56]
      );
      if (pool.matches.length) {
        document.moveDown(0.35);
        table(
          ["Tour", playingArea(tournament), "Rencontre", "Score", "Statut"],
          pool.matches.map((match) => [
            String(match.round),
            match.tableNumber ? String(match.tableNumber) : "—",
            `${teamName(match.teamA)} / ${teamName(match.teamB)}`,
            match.scoreA === null ? "—" : `${match.scoreA} - ${match.scoreB}`,
            statusLabels[match.status],
          ]),
          [40, 45, 250, 76, 100]
        );
      }
    }

    section(tournament.competitionMode === "AURARD" ? "Classement des rondes" : "Classement général");
    const names = new Map(tournament.teams.map((team) => [team.id, teamName(team)]));
    if (tournament.competitionMode === "AURARD") {
      const qualifiedCount = qualifiedCountFor(tournament);
      const qualificationsFinal = aurardQualificationsAreFinal(tournament);
      table(["#", teamLabel(tournament), "J", "V", "Points", "Diff.", "Qualifiée"], aurardStandingsData(tournament).map((row, index) => [
        String(index + 1), names.get(row.teamId) ?? "", String(row.played), String(row.wins), String(row.pointsFor), row.diff > 0 ? `+${row.diff}` : String(row.diff), qualificationsFinal && index < qualifiedCount ? "Oui" : "",
      ]), [30, 210, 37, 37, 65, 67, 65]);
    } else {
      table(["#", teamLabel(tournament), "Poule", "Victoires", "Différence"], standingsData(tournament).map((row) => [
        String(row.rankGeneral), names.get(row.teamId) ?? "", `${row.poolLetter} (${row.rankInPool})`, String(row.wins), row.diff > 0 ? `+${row.diff}` : String(row.diff),
      ]), [35, 231, 90, 75, 80]);
    }

    if (tournament.bracketMatches.length) {
      const orderedBracket = orderedBracketMatches(tournament);
      section("Tableau final");
      table(
        ["Tour", playingArea(tournament), "Rencontre", "Score", "Statut"],
        orderedBracket.map((match) => [
          roundLabels[match.roundName],
          match.tableNumber ? String(match.tableNumber) : "—",
          `${teamName(match.teamA)} / ${teamName(match.teamB)}`,
          match.scoreA === null ? "—" : `${match.scoreA} - ${match.scoreB}`,
          match.isBye ? "Qualifiée d’office" : statusLabels[match.status],
        ]),
        [100, 45, 220, 66, 80]
      );
    }

    const range = document.bufferedPageRange();
    for (let index = 0; index < range.count; index += 1) {
      document.switchToPage(index);
      document.font("Helvetica").fontSize(8).fillColor("#6b7280");
      const label = `Page ${index + 1} / ${range.count}`;
      // No text width: PDFKit must not wrap into a new page inside the bottom margin.
      document.text(label, 42 + pageWidth - document.widthOfString(label), 810, { lineBreak: false });
    }
    document.end();
  });
}
