ALTER TABLE "Tournament"
  ADD COLUMN "aurardQualifierCount" INTEGER,
  ADD COLUMN "aurardQualifierChoiceRequired" BOOLEAN NOT NULL DEFAULT false;
