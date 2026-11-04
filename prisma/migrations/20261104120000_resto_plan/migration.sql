-- Offre Resto (phase 3) : nouvelle valeur d'offre et réglages du pack. Purement additif.
ALTER TYPE "Plan" ADD VALUE IF NOT EXISTS 'RESTO';

ALTER TABLE "Restaurant"
  ADD COLUMN "packContents" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "networks" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN "packDay" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "packEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "onboardedAt" TIMESTAMP(3);
