import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type ScrollableRankingTableProps = HTMLAttributes<HTMLDivElement> & {
  hint?: string;
};

/**
 * Keeps wide ranking tables usable on a phone without forcing landscape mode.
 * The table itself scrolls horizontally; the page can still scroll vertically.
 */
export function ScrollableRankingTable({
  children,
  className,
  hint = "Glissez le tableau pour voir la différence de points et les qualifiées",
  ...props
}: ScrollableRankingTableProps) {
  return (
    <>
      <p className="border-b border-border px-4 py-2 text-xs font-medium text-accent sm:hidden">
        ← {hint} →
      </p>
      <div
        className={cn("ranking-table-scroll overflow-x-auto overscroll-x-contain", className)}
        {...props}
      >
        {children}
      </div>
    </>
  );
}
