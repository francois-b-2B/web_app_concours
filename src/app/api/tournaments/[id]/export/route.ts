import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  createCsv,
  createPdf,
  createSpreadsheet,
  tournamentExportInclude,
} from "@/lib/export/tournament-export";

export const runtime = "nodejs";

const formats = {
  pdf: { contentType: "application/pdf", extension: "pdf" },
  xlsx: {
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    extension: "xlsx",
  },
  xls: { contentType: "application/vnd.ms-excel", extension: "xls" },
  ods: { contentType: "application/vnd.oasis.opendocument.spreadsheet", extension: "ods" },
  csv: { contentType: "text/csv; charset=utf-8", extension: "csv" },
} as const;

type ExportFormat = keyof typeof formats;

function safeFilename(value: string) {
  return (
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "concours"
  );
}

export async function GET(request: Request, context: RouteContext<"/api/tournaments/[id]/export">) {
  const session = await auth();
  if (!session?.user.id) return new Response("Non autorisé", { status: 401 });

  const { id } = await context.params;
  const url = new URL(request.url);
  const requestedFormat = url.searchParams.get("format");
  if (!requestedFormat || !(requestedFormat in formats)) {
    return new Response("Format invalide", { status: 400 });
  }
  const format = requestedFormat as ExportFormat;

  const tournament = await prisma.tournament.findUnique({
    where: { id },
    include: tournamentExportInclude,
  });
  if (!tournament || tournament.ownerId !== session.user.id) {
    return new Response("Concours introuvable", { status: 404 });
  }

  let file: Buffer;
  if (format === "pdf") file = await createPdf(tournament);
  else if (format === "csv") file = createCsv(tournament);
  else file = createSpreadsheet(tournament, format);

  const metadata = formats[format];
  const filename = `${safeFilename(tournament.name)}-${new Date().toISOString().slice(0, 10)}.${metadata.extension}`;

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": metadata.contentType,
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
