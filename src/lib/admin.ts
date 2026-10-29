import { notFound } from "next/navigation";
import { auth } from "@/auth";

// The environment variable is the preferred way to add or change administrators.
// The current application owner remains available locally until it is configured.
const defaultAdminEmails = ["francois.buttafoghi@gmail.com"];

function adminEmails() {
  const configured = process.env.ADMIN_EMAILS
    ?.split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);

  return configured?.length ? configured : defaultAdminEmails;
}

export function isAdminEmail(email: string | null | undefined) {
  return Boolean(email && adminEmails().includes(email.trim().toLowerCase()));
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user.id || !isAdminEmail(session.user.email)) notFound();
  return session;
}
