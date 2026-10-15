import { z } from "zod";

export const createTournamentSchema = z.object({
  name: z.string().min(1, "Nom requis."),
  date: z.string().min(1, "Date requise."),
  location: z.string().optional(),
  format: z.enum(["BELOTE", "BOULES"]),
  teamComposition: z.enum(["DOUBLETTES", "TRIPLETTES"]).default("DOUBLETTES"),
  competitionMode: z.enum(["POOLS", "AURARD"]),
});

export const addTeamSchema = z.object({
  player1: z.string().min(1, "Joueur 1 requis."),
  player2: z.string().min(1, "Joueur 2 requis."),
  player3: z.string().optional(),
  paymentStatus: z.enum(["PAID", "PENDING"]).default("PENDING"),
  contact: z.string().optional(),
});

export const aurardRoundsSchema = z.object({
  aurardRounds: z.coerce.number().int().min(2).max(4),
});

export const aurardQualifierCountSchema = z.object({
  aurardQualifierCount: z.coerce.number().int().refine(
    (value) => [4, 8, 16, 32, 64].includes(value),
    "Choisis un tableau de 4, 8, 16, 32 ou 64 équipes.",
  ),
});
