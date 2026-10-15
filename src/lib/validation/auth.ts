import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Identifiant requis."),
  password: z.string().min(1, "Mot de passe requis."),
});

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "L’identifiant doit contenir au moins 3 caractères.")
    .max(30, "L’identifiant ne doit pas dépasser 30 caractères."),
  email: z.preprocess(
    (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
    z.string().trim().email("Adresse e-mail invalide.").optional()
  ),
  password: z.string().min(8, "8 caractères minimum."),
});
