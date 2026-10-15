"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { signOut } from "@/auth";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}

export async function deleteTournamentAction(tournamentId: string) {
  const session = await auth();
  if (!session?.user.id) notFound();

  const tournament = await prisma.tournament.findFirst({
    where: {
      id: tournamentId,
      ownerId: session.user.id,
    },
    select: { id: true },
  });

  if (!tournament) notFound();

  await prisma.$transaction(async (transaction) => {
    await transaction.bracketMatch.deleteMany({
      where: { tournamentId: tournament.id },
    });
    await transaction.poolMatch.deleteMany({
      where: { pool: { tournamentId: tournament.id } },
    });
    await transaction.team.deleteMany({
      where: { tournamentId: tournament.id },
    });
    await transaction.pool.deleteMany({
      where: { tournamentId: tournament.id },
    });
    await transaction.contactMessage.deleteMany({
      where: { tournamentId: tournament.id },
    });
    await transaction.tournament.delete({
      where: { id: tournament.id },
    });
  });

  revalidatePath("/dashboard");
}
