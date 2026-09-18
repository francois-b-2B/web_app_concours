"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { addTeamSchema } from "@/lib/validation/tournament";

export interface AddTeamState {
  error?: string;
}

async function requireOwnedTournament(tournamentId: string) {
  const session = await auth();
  if (!session?.user.id) notFound();

  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
  });
  if (!tournament || tournament.ownerId !== session.user.id) notFound();

  return tournament;
}

export async function addTeamAction(
  tournamentId: string,
  _prevState: AddTeamState,
  formData: FormData
): Promise<AddTeamState> {
  const tournament = await requireOwnedTournament(tournamentId);

  const parsed = addTeamSchema.safeParse({
    player1: formData.get("player1"),
    player2: formData.get("player2"),
    contact: formData.get("contact") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const teamCount = await prisma.team.count({ where: { tournamentId } });
  if (teamCount >= tournament.maxTeams) {
    return { error: `Le concours est limité à ${tournament.maxTeams} équipes.` };
  }

  const last = await prisma.team.findFirst({
    where: { tournamentId },
    orderBy: { registrationNumber: "desc" },
  });

  await prisma.team.create({
    data: {
      tournamentId,
      registrationNumber: (last?.registrationNumber ?? 0) + 1,
      player1: parsed.data.player1,
      player2: parsed.data.player2,
      contact: parsed.data.contact,
    },
  });

  revalidatePath(`/tournaments/${tournamentId}/teams`);
  return {};
}

export async function togglePaymentAction(tournamentId: string, teamId: string) {
  await requireOwnedTournament(tournamentId);

  const team = await prisma.team.findUnique({ where: { id: teamId } });
  if (!team || team.tournamentId !== tournamentId) notFound();

  await prisma.team.update({
    where: { id: teamId },
    data: { paymentStatus: team.paymentStatus === "PAID" ? "PENDING" : "PAID" },
  });

  revalidatePath(`/tournaments/${tournamentId}/teams`);
}

export async function deleteTeamAction(tournamentId: string, teamId: string) {
  await requireOwnedTournament(tournamentId);

  await prisma.team.deleteMany({ where: { id: teamId, tournamentId } });

  revalidatePath(`/tournaments/${tournamentId}/teams`);
}
