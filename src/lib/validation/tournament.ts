import { z } from "zod";

export const createTournamentSchema = z.object({
  name: z.string().min(1, "Nom requis."),
  date: z.string().min(1, "Date requise."),
  location: z.string().optional(),
  format: z.enum(["BELOTE", "BOULES"]),
  maxTeams: z.coerce.number().int().min(3).max(128),
});

export const addTeamSchema = z.object({
  player1: z.string().min(1, "Joueur 1 requis."),
  player2: z.string().min(1, "Joueur 2 requis."),
  contact: z.string().optional(),
});
