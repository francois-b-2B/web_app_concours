import type { Prisma } from "@prisma/client";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/** Serialize tournament structure/score changes, including requests from two tabs. */
export async function withOwnedTournament<T>(
  tournamentId: string,
  work: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const session = await auth();
  if (!session?.user.id) notFound();
  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "Tournament"
      WHERE "id" = ${tournamentId} AND "ownerId" = ${session.user.id}
      FOR UPDATE
    `;
    if (rows.length !== 1) notFound();
    return work(tx);
  }, { maxWait: 10_000, timeout: 30_000 });
}
