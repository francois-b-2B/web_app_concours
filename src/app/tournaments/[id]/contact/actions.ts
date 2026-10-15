"use server";

import { notFound } from "next/navigation";
import { z } from "zod";
import { Resend } from "resend";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const allowedSubjects = [
  "Suggestion d’amélioration",
  "Donner votre avis",
  "Signaler un problème",
  "Question sur l’utilisation",
  "Autre demande",
] as const;

const contactSchema = z.object({
  name: z.string().trim().min(1, "Indiquez votre nom."),
  email: z.string().trim().email("Indiquez une adresse e-mail valide."),
  subjects: z.array(z.enum(allowedSubjects)).min(1, "Sélectionnez au moins un motif."),
  message: z.string().trim().min(10, "Votre message doit contenir au moins 10 caractères."),
});

export interface ContactState {
  error?: string;
  success?: boolean;
  warning?: string;
}

function isTemporaryDatabaseError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error.code === "P1001" || error.code === "P2024")
  );
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        character
      ] ?? character
  );
}

export async function sendContactAction(
  tournamentId: string,
  _previousState: ContactState,
  formData: FormData
): Promise<ContactState> {
  const session = await auth();
  if (!session?.user.id) notFound();

  const parsed = contactSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subjects: formData.getAll("subjects"),
    message: formData.get("message"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  try {
    const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament || tournament.ownerId !== session.user.id) notFound();

    await prisma.contactMessage.create({
      data: {
        userId: session.user.id,
        tournamentId,
        ...parsed.data,
      },
    });
  } catch (error) {
    if (isTemporaryDatabaseError(error)) {
      return {
        error: "La base de données est momentanément indisponible. Réessayez dans quelques secondes.",
      };
    }
    throw error;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const recipient = process.env.CONTACT_TO_EMAIL;
  if (!apiKey || !recipient) {
    return {
      success: true,
      warning: "Message enregistré. L’envoi par e-mail sera activé après la configuration de Resend.",
    };
  }

  const resend = new Resend(apiKey);
  const { error: emailError } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL ?? "Concours <onboarding@resend.dev>",
    to: recipient,
    replyTo: parsed.data.email,
    subject: `Contact — ${parsed.data.subjects.join(", ")}`,
    html: `
      <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#171717;line-height:1.6">
        <h2>Nouveau message depuis Concours Belote &amp; Boules</h2>
        <p><strong>Nom :</strong> ${escapeHtml(parsed.data.name)}</p>
        <p><strong>E-mail :</strong> ${escapeHtml(parsed.data.email)}</p>
        <p><strong>Motif :</strong> ${parsed.data.subjects.map(escapeHtml).join(", ")}</p>
        <hr style="border:0;border-top:1px solid #ddd" />
        <p style="white-space:pre-wrap">${escapeHtml(parsed.data.message)}</p>
      </div>
    `,
  });

  if (emailError) {
    return {
      success: true,
      warning: "Message enregistré, mais l’e-mail n’a pas pu être envoyé.",
    };
  }

  return { success: true };
}
