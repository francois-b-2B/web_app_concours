import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Card, Badge } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { saveMatchScoreAction } from "./actions";

export default async function PoolMatchSheetPage({
  params,
}: {
  params: Promise<{ id: string; letter: string }>;
}) {
  const { id, letter } = await params;
  const session = await auth();
  if (!session?.user.id) notFound();

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament || tournament.ownerId !== session.user.id) notFound();

  const pool = await prisma.pool.findUnique({
    where: { tournamentId_letter: { tournamentId: id, letter } },
    include: {
      matches: {
        orderBy: [{ round: "asc" }, { tableNumber: "asc" }],
        include: { teamA: true, teamB: true },
      },
    },
  });
  if (!pool) notFound();

  const rounds = [...new Set(pool.matches.map((m) => m.round))].sort((a, b) => a - b);

  return (
    <main className="flex-1 px-6 py-10">
      <div className="max-w-2xl mx-auto flex flex-col gap-8">
        <h1 className="text-3xl font-bold">Poule {pool.letter}</h1>

        {rounds.map((round) => (
          <div key={round} className="flex flex-col gap-4">
            <h2 className="text-[15px] font-semibold text-muted uppercase tracking-wide">
              Ronde {round}
            </h2>
            <div className="flex flex-col gap-4">
              {pool.matches
                .filter((m) => m.round === round)
                .map((match) => (
                  <Card key={match.id} className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] text-muted">
                        {match.status === "TO_REPLAY" && "Égalité — à rejouer"}
                        {match.status === "DONE" && "Terminé"}
                        {match.status === "PENDING" && "À jouer"}
                      </span>
                      {match.tableNumber && <Badge>Table {match.tableNumber}</Badge>}
                    </div>

                    <form
                      action={saveMatchScoreAction.bind(null, id, match.id)}
                      className="flex flex-col gap-3"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex-1 text-[16px] font-medium">
                          {match.teamA.player1} et {match.teamA.player2}
                        </span>
                        <Input
                          type="number"
                          name="scoreA"
                          min={0}
                          defaultValue={match.scoreA ?? undefined}
                          className="w-24 text-center"
                        />
                      </div>
                      <div className="text-center text-[12px] font-semibold text-muted tracking-wide">
                        CONTRE
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="flex-1 text-[16px] font-medium">
                          {match.teamB.player1} et {match.teamB.player2}
                        </span>
                        <Input
                          type="number"
                          name="scoreB"
                          min={0}
                          defaultValue={match.scoreB ?? undefined}
                          className="w-24 text-center"
                        />
                      </div>
                      <Button type="submit" variant="secondary" className="mt-1">
                        Enregistrer
                      </Button>
                    </form>
                  </Card>
                ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
