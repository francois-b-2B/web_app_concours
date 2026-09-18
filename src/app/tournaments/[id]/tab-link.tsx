"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

export function TabLink({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname?.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={cn(
        "rounded-pill px-4 py-2 text-[14px] font-medium transition-colors",
        active ? "bg-accent text-white" : "text-muted hover:text-foreground"
      )}
    >
      {label}
    </Link>
  );
}
