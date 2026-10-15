CREATE TABLE "AurardMatch" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "slotIndex" INTEGER NOT NULL,
    "tableNumber" INTEGER,
    "teamAId" TEXT,
    "teamBId" TEXT,
    "scoreA" INTEGER,
    "scoreB" INTEGER,
    "status" "MatchStatus" NOT NULL DEFAULT 'PENDING',
    "winnerId" TEXT,
    "isBye" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AurardMatch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AurardMatch_tournamentId_round_slotIndex_key"
ON "AurardMatch"("tournamentId", "round", "slotIndex");

CREATE INDEX "AurardMatch_tournamentId_round_idx"
ON "AurardMatch"("tournamentId", "round");

ALTER TABLE "AurardMatch"
ADD CONSTRAINT "AurardMatch_tournamentId_fkey"
FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AurardMatch"
ADD CONSTRAINT "AurardMatch_teamAId_fkey"
FOREIGN KEY ("teamAId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AurardMatch"
ADD CONSTRAINT "AurardMatch_teamBId_fkey"
FOREIGN KEY ("teamBId") REFERENCES "Team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
