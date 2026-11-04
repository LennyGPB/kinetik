-- Pack de la semaine (phase 4). Purement additif.
CREATE TYPE "RestoPackStatus" AS ENUM ('PREPARING', 'READY', 'VALIDATED', 'SKIPPED');

ALTER TABLE "Restaurant"
  ADD COLUMN "locale" TEXT NOT NULL DEFAULT 'fr',
  ADD COLUMN "autoTopUp" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "RestoPack" (
    "id" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "packDate" TEXT NOT NULL,
    "status" "RestoPackStatus" NOT NULL DEFAULT 'PREPARING',
    "items" JSONB NOT NULL DEFAULT '[]',
    "skipped" JSONB NOT NULL DEFAULT '[]',
    "reason" TEXT,
    "creditCost" INTEGER NOT NULL DEFAULT 0,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RestoPack_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "RestoPack_restaurantId_packDate_key" ON "RestoPack"("restaurantId", "packDate");
CREATE INDEX "RestoPack_userId_packDate_idx" ON "RestoPack"("userId", "packDate");
ALTER TABLE "RestoPack" ADD CONSTRAINT "RestoPack_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "Restaurant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Project" ADD COLUMN "restoPackId" TEXT;
CREATE INDEX "Project_restoPackId_idx" ON "Project"("restoPackId");
ALTER TABLE "Project" ADD CONSTRAINT "Project_restoPackId_fkey" FOREIGN KEY ("restoPackId") REFERENCES "RestoPack"("id") ON DELETE SET NULL ON UPDATE CASCADE;
