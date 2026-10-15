CREATE TYPE "CompetitionMode" AS ENUM ('POOLS', 'AURARD');

ALTER TABLE "Tournament"
ADD COLUMN "competitionMode" "CompetitionMode" NOT NULL DEFAULT 'POOLS';
