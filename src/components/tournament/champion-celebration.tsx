"use client";

import { useEffect } from "react";

export function ChampionCelebration() {
  const burstClasses = [
    "champion-celebration__burst",
    "champion-celebration__burst champion-celebration__burst--second",
    "champion-celebration__burst champion-celebration__burst--third",
    "champion-celebration__burst champion-celebration__burst--fourth",
    "champion-celebration__burst champion-celebration__burst--fifth",
    "champion-celebration__burst champion-celebration__burst--sixth",
    "champion-celebration__burst champion-celebration__burst--seventh",
    "champion-celebration__burst champion-celebration__burst--eighth",
    "champion-celebration__burst champion-celebration__burst--ninth",
    "champion-celebration__burst champion-celebration__burst--tenth",
    "champion-celebration__burst champion-celebration__burst--eleventh",
    "champion-celebration__burst champion-celebration__burst--twelfth",
    "champion-celebration__burst champion-celebration__burst--thirteenth",
    "champion-celebration__burst champion-celebration__burst--fourteenth",
    "champion-celebration__burst champion-celebration__burst--fifteenth",
    "champion-celebration__burst champion-celebration__burst--sixteenth",
    "champion-celebration__burst champion-celebration__burst--seventeenth",
    "champion-celebration__burst champion-celebration__burst--eighteenth",
  ];

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
      {Array.from({ length: 2 }, (_, layerIndex) => (
        <span className={`champion-celebration__layer champion-celebration__layer--${layerIndex + 1}`} key={layerIndex}>
          {burstClasses.map((burstClass, burstIndex) => <span className={burstClass} key={burstIndex} />)}
        </span>
      ))}
    </div>
  );
}
