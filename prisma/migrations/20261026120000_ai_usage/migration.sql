-- Coût réel des demandes IA du chat de l'éditeur (facturation selon la complexité)
CREATE TABLE "AiUsage" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "projectId" TEXT,
  "operation" TEXT NOT NULL,
  "plan" "Plan" NOT NULL,
  "turns" INTEGER NOT NULL,
  "previews" INTEGER NOT NULL,
  "inputTokens" INTEGER NOT NULL,
  "cacheReadTokens" INTEGER NOT NULL,
  "cacheWriteTokens" INTEGER NOT NULL,
  "outputTokens" INTEGER NOT NULL,
  "costMicroUsd" INTEGER NOT NULL,
  "credits" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AiUsage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AiUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "AiUsage_createdAt_idx" ON "AiUsage"("createdAt");
CREATE INDEX "AiUsage_userId_createdAt_idx" ON "AiUsage"("userId", "createdAt");
