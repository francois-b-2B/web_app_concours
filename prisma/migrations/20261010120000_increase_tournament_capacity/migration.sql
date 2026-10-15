-- Change the default for new tournaments only; existing maxTeams values stay untouched.
ALTER TABLE "Tournament" ALTER COLUMN "maxTeams" SET DEFAULT 256;
