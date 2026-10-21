"use client";

import { useEffect } from "react";

export function ChampionCelebration() {
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const championCard = document.getElementById("champion-card");
      if (!championCard) return;

      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      championCard.scrollIntoView({
        behavior: prefersReducedMotion ? "auto" : "smooth",
        block: "center",
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className="champion-celebration" aria-hidden="true">
      <span className="champion-celebration__burst" />
      <span className="champion-celebration__burst champion-celebration__burst--second" />
      <span className="champion-celebration__burst champion-celebration__burst--third" />
      <span className="champion-celebration__burst champion-celebration__burst--fourth" />
      <span className="champion-celebration__burst champion-celebration__burst--fifth" />
      <span className="champion-celebration__burst champion-celebration__burst--sixth" />
      <span className="champion-celebration__burst champion-celebration__burst--seventh" />
      <span className="champion-celebration__burst champion-celebration__burst--eighth" />
      <span className="champion-celebration__burst champion-celebration__burst--ninth" />
      <span className="champion-celebration__burst champion-celebration__burst--tenth" />
      <span className="champion-celebration__burst champion-celebration__burst--eleventh" />
      <span className="champion-celebration__burst champion-celebration__burst--twelfth" />
      <span className="champion-celebration__burst champion-celebration__burst--thirteenth" />
      <span className="champion-celebration__burst champion-celebration__burst--fourteenth" />
      <span className="champion-celebration__burst champion-celebration__burst--fifteenth" />
      <span className="champion-celebration__burst champion-celebration__burst--sixteenth" />
      <span className="champion-celebration__burst champion-celebration__burst--seventeenth" />
      <span className="champion-celebration__burst champion-celebration__burst--eighteenth" />
    </div>
  );
}
