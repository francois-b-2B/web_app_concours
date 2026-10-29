import type { ReactNode } from "react";
import Link from "next/link";
import { requireAdmin } from "@/lib/admin";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex-1 flex flex-col">
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div>
            <Link href="/dashboard" className="text-lg font-medium text-muted hover:text-foreground">
              ← Tableau de bord
            </Link>
            <p className="mt-1 text-xl font-semibold">Administration</p>
          </div>
          <span className="rounded-pill border border-accent/50 px-3.5 py-1 text-[13px] font-semibold text-accent">
            Accès administrateur
          </span>
        </div>
      </header>
      {children}
    </div>
  );
}
