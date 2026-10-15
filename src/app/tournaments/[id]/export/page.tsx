import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { DownloadButton } from "./download-button";

const formats = [
  {
    id: "pdf",
    title: "Document PDF",
    description: "Prêt à imprimer ou à partager.",
    extension: ".pdf",
  },
  {
    id: "xlsx",
    title: "Excel",
    description: "Format récent, avec plusieurs feuilles.",
    extension: ".xlsx",
  },
  {
    id: "xls",
    title: "Ancien Excel",
    description: "Compatible avec les anciennes versions d’Excel.",
    extension: ".xls",
  },
  {
    id: "ods",
    title: "OpenOffice / LibreOffice",
    description: "Format tableur libre OpenDocument.",
    extension: ".ods",
  },
  {
    id: "csv",
    title: "CSV",
    description: "Format simple compatible avec tous les tableurs.",
    extension: ".csv",
  },
] as const;

export default async function ExportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user.id) notFound();

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament || tournament.ownerId !== session.user.id) notFound();

  return (
    <main className="flex-1 px-6 py-10">
      <div className="max-w-4xl mx-auto flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold">Exporter le concours : 5 formats</h1>
          <p className="mt-2 text-muted">
            Télécharge les inscriptions, les poules, les matchs, le classement et le tableau final.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {formats.map((format) => (
            <Card key={format.id} className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-semibold">{format.title}</h2>
                  <p className="mt-1 text-[14px] text-muted">{format.description}</p>
                </div>
                <span className="shrink-0 rounded-full border border-border px-3 py-1 text-[12px] text-muted">
                  {format.extension}
                </span>
              </div>
              <DownloadButton url={`/api/tournaments/${id}/export?format=${format.id}`} />
            </Card>
          ))}
        </div>
      </div>
    </main>
  );
}
