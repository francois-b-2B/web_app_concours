import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TabLink } from "./tab-link";

export default async function TournamentLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user.id) notFound();

  const tournament = await prisma.tournament.findUnique({ where: { id } });
  if (!tournament || tournament.ownerId !== session.user.id) notFound();

  const tabs = [
    { href: `/tournaments/${id}/teams`, label: "Inscriptions" },
    { href: `/tournaments/${id}/draw`, label: "Tirage" },
    { href: `/tournaments/${id}/pools`, label: "Poules" },
    { href: `/tournaments/${id}/standings`, label: "Classement" },
    { href: `/tournaments/${id}/bracket`, label: "Tableau final" },
  ];

  return (
    <div className="flex-1 flex flex-col">
      <div className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <Link href="/dashboard" className="text-[13px] text-muted hover:text-foreground">
                ← Tableau de bord
              </Link>
              <h1 className="text-xl font-semibold">{tournament.name}</h1>
            </div>
          </div>
          <nav className="flex flex-wrap gap-1 -mx-2">
            {tabs.map((tab) => (
              <TabLink key={tab.href} href={tab.href} label={tab.label} />
            ))}
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}
