"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createTournamentSchema } from "@/lib/validation/tournament";

export interface CreateTournamentState {
  error?: string;
}

export async function createTournamentAction(
  _prevState: CreateTournamentState,
  formData: FormData
): Promise<CreateTournamentState> {
  const session = await auth();
  if (!session?.user.id) redirect("/login");

  const parsed = createTournamentSchema.safeParse({
    name: formData.get("name"),
    date: formData.get("date"),
    location: formData.get("location") || undefined,
    format: formData.get("format"),
    maxTeams: formData.get("maxTeams"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { name, date, location, format, maxTeams } = parsed.data;

  const tournament = await prisma.tournament.create({
    data: {
      ownerId: session.user.id,
      name,
      date: new Date(date),
      location,
      format,
      maxTeams,
    },
  });

  redirect(`/tournaments/${tournament.id}/teams`);
}
