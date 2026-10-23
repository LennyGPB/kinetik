ALTER TABLE "BrandKit" ADD COLUMN "sourceUrl" TEXT, ADD COLUMN "brief" JSONB;
CREATE TABLE "UrlVideoAnalysis" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "projectIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "settledProjectIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "UrlVideoAnalysis_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "UrlVideoAnalysis_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "UrlVideoAnalysis_userId_createdAt_idx" ON "UrlVideoAnalysis"("userId", "createdAt");
