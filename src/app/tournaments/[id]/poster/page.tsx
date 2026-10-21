import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PosterEditor } from "./poster-editor";

export default async function PosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user.id) notFound();

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament || tournament.ownerId !== session.user.id) notFound();

  const sportLabel = tournament.format === "BELOTE" ? "belote" : "boules";

  return (
    <main className="flex-1 px-6 py-10">
      <div className="max-w-6xl mx-auto flex flex-col gap-8">
        <div>
          <h1 className="text-3xl font-bold">Créer l’affiche de {sportLabel}</h1>
          <p className="mt-2 text-muted">
            Modifie les informations et observe le résultat directement sur l’affiche.
          </p>
        </div>
        <PosterEditor
          key={`${tournament.format}-${tournament.teamComposition}`}
          format={tournament.format}
          teamComposition={tournament.teamComposition}
        />
      </div>
    </main>
  );
}
