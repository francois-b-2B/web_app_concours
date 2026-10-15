"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { withOwnedTournament } from "@/lib/tournament/owned-transaction";
import { REGISTRATION_LOCK_MESSAGE } from "@/lib/tournament/score-integrity";
import { addTeamSchema, aurardQualifierCountSchema, aurardRoundsSchema } from "@/lib/validation/tournament";
import { isAurardQualifierCount } from "@/lib/tournament";

export interface AddTeamState {
  error?: string;
}

export interface UpdateTeamState {
  error?: string;
  success?: boolean;
}

export interface AurardRoundsState {
  error?: string;
  success?: boolean;
  rounds?: number;
}

export interface AurardQualifierState {
  error?: string;
  success?: boolean;
  qualifierCount?: number;
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

export async function saveAurardRoundsAction(
  tournamentId: string,
  stateOrFormData: AurardRoundsState | FormData,
  actionFormData?: FormData,
): Promise<AurardRoundsState> {
  const formData = actionFormData ?? stateOrFormData;
  if (!(formData instanceof FormData)) return { error: "Formulaire invalide." };
  const result = await withOwnedTournament(tournamentId, async (tx): Promise<AurardRoundsState> => {
    const tournament = await tx.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) notFound();
    if (tournament.competitionMode !== "AURARD") {
      return { error: "Ce réglage concerne uniquement les Rondes." };
    }
    if (tournament.status !== "REGISTRATION") {
      return { error: "Le nombre de rondes est verrouillé dès le lancement du concours." };
    }

    const parsed = aurardRoundsSchema.safeParse({
      aurardRounds: formData.get("aurardRounds"),
    });
    if (!parsed.success) return { error: "Choisis 2, 3 ou 4 parties." };

    await tx.tournament.update({
      where: { id: tournamentId },
      data: { aurardRounds: parsed.data.aurardRounds },
    });
    return { success: true, rounds: parsed.data.aurardRounds };
  });

  revalidatePath(`/tournaments/${tournamentId}/teams`);
  revalidatePath(`/tournaments/${tournamentId}/draw`);
  revalidatePath(`/tournaments/${tournamentId}/standings`);
  revalidatePath(`/tournaments/${tournamentId}/bracket`);
  revalidatePath(`/public/tournaments/${tournamentId}`);
  return result;
}

export async function saveAurardQualifierCountAction(
  tournamentId: string,
  stateOrFormData: AurardQualifierState | FormData,
  actionFormData?: FormData,
): Promise<AurardQualifierState> {
  const formData = actionFormData ?? stateOrFormData;
  if (!(formData instanceof FormData)) return { error: "Formulaire invalide." };
  const result = await withOwnedTournament(tournamentId, async (tx): Promise<AurardQualifierState> => {
    const tournament = await tx.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) notFound();
    if (tournament.competitionMode !== "AURARD") return { error: "Ce réglage concerne uniquement les Rondes." };
    if (tournament.status !== "REGISTRATION") return { error: "Le tableau final est verrouillé dès le lancement de la première ronde." };

    const parsed = aurardQualifierCountSchema.safeParse({
      aurardQualifierCount: formData.get("aurardQualifierCount"),
    });
    if (!parsed.success || !isAurardQualifierCount(parsed.data.aurardQualifierCount)) {
      return { error: "Choisis un tableau de 4, 8, 16, 32 ou 64 équipes." };
    }

    const teamCount = await tx.team.count({ where: { tournamentId } });
    if (parsed.data.aurardQualifierCount >= teamCount) {
      return { error: "Le tableau final doit compter strictement moins d’équipes que le concours." };
    }

    await tx.tournament.update({
      where: { id: tournamentId },
      data: {
        aurardQualifierCount: parsed.data.aurardQualifierCount,
        aurardQualifierChoiceRequired: false,
      },
    });
    return { success: true, qualifierCount: parsed.data.aurardQualifierCount };
  });

  revalidatePath(`/tournaments/${tournamentId}/teams`);
  revalidatePath(`/tournaments/${tournamentId}/draw`);
  revalidatePath(`/tournaments/${tournamentId}/standings`);
  revalidatePath(`/tournaments/${tournamentId}/bracket`);
  revalidatePath(`/public/tournaments/${tournamentId}`);
  return result;
}

export async function addTeamAction(
  tournamentId: string,
  _prevState: AddTeamState,
  formData: FormData
): Promise<AddTeamState> {
  const result = await withOwnedTournament(tournamentId, async (tx): Promise<AddTeamState> => {
    const tournament = await tx.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) notFound();
    if (
      await tx.pool.count({ where: { tournamentId } }) ||
      await tx.aurardMatch.count({ where: { tournamentId } })
    ) return { error: REGISTRATION_LOCK_MESSAGE };

    const parsed = addTeamSchema.safeParse({
      player1: formData.get("player1"),
      player2: formData.get("player2"),
      player3: formData.get("player3") || undefined,
      paymentStatus: formData.get("paymentStatus") || undefined,
      contact: formData.get("contact") || undefined,
    });

    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
    }

    if (tournament.teamComposition === "TRIPLETTES" && !parsed.data.player3) {
      return { error: "Joueur 3 requis pour une triplette." };
    }

    const teamCount = await tx.team.count({ where: { tournamentId } });
    if (teamCount >= tournament.maxTeams) {
      return { error: `Le concours est limité à ${tournament.maxTeams} équipes.` };
    }

    const last = await tx.team.findFirst({
      where: { tournamentId },
      orderBy: { registrationNumber: "desc" },
    });

    await tx.team.create({
      data: {
        tournamentId,
        registrationNumber: (last?.registrationNumber ?? 0) + 1,
        player1: parsed.data.player1,
        player2: parsed.data.player2,
        player3: tournament.teamComposition === "TRIPLETTES" ? parsed.data.player3 : null,
        paymentStatus: parsed.data.paymentStatus,
        contact: parsed.data.contact ?? null,
      },
    });

    return {};
  });
  revalidatePath(`/tournaments/${tournamentId}/teams`);
  revalidatePath(`/tournaments/${tournamentId}/draw`);
  return result;
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

export async function updateTeamAction(
  tournamentId: string,
  teamId: string,
  _prevState: UpdateTeamState,
  formData: FormData
): Promise<UpdateTeamState> {
  const tournament = await requireOwnedTournament(tournamentId);

  const parsed = addTeamSchema.pick({ player1: true, player2: true, player3: true, contact: true }).safeParse({
    player1: formData.get("player1"),
    player2: formData.get("player2"),
    player3: formData.get("player3") || undefined,
    contact: formData.get("contact") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }
  if (tournament.teamComposition === "TRIPLETTES" && !parsed.data.player3) {
    return { error: "Joueur 3 requis pour une triplette." };
  }

  const result = await prisma.team.updateMany({
    where: { id: teamId, tournamentId },
    data: {
      player1: parsed.data.player1,
      player2: parsed.data.player2,
      player3: tournament.teamComposition === "TRIPLETTES" ? parsed.data.player3 : null,
      contact: parsed.data.contact ?? null,
    },
  });
  if (result.count === 0) notFound();

  revalidatePath(`/tournaments/${tournamentId}/teams`);
  revalidatePath(`/tournaments/${tournamentId}/pools`);
  revalidatePath(`/tournaments/${tournamentId}/standings`);
  revalidatePath(`/tournaments/${tournamentId}/bracket`);
  revalidatePath(`/public/tournaments/${tournamentId}`);
  return { success: true };
}

export async function deleteTeamAction(tournamentId: string, teamId: string): Promise<AddTeamState> {
  const result = await withOwnedTournament(tournamentId, async (tx): Promise<AddTeamState> => {
    const tournament = await tx.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) notFound();
    if (
      await tx.pool.count({ where: { tournamentId } }) ||
      await tx.aurardMatch.count({ where: { tournamentId } })
    ) return { error: REGISTRATION_LOCK_MESSAGE };
    await tx.team.deleteMany({ where: { id: teamId, tournamentId } });
    const teamCount = await tx.team.count({ where: { tournamentId } });
    if (
      tournament.competitionMode === "AURARD" &&
      tournament.aurardQualifierCount !== null &&
      tournament.aurardQualifierCount >= teamCount
    ) {
      await tx.tournament.update({
        where: { id: tournamentId },
        data: { aurardQualifierCount: null, aurardQualifierChoiceRequired: true },
      });
    }
    return {};
  });
  revalidatePath(`/tournaments/${tournamentId}/teams`);
  revalidatePath(`/tournaments/${tournamentId}/draw`);
  return result;
}
