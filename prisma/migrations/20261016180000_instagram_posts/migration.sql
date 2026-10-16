ALTER TABLE "Project" ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'MOTION';

CREATE TABLE "PostExport" (
  "id" TEXT NOT NULL,
  "projectId" TEXT NOT NULL,
  "versionId" TEXT NOT NULL,
  "requestId" TEXT NOT NULL,
  "status" "RenderStatus" NOT NULL DEFAULT 'PENDING',
  "format" TEXT NOT NULL,
  "files" TEXT[] DEFAULT ARRAY[]::TEXT[],
  "creditCost" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PostExport_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PostExport_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PostExport_requestId_key" ON "PostExport"("requestId");
CREATE INDEX "PostExport_projectId_idx" ON "PostExport"("projectId");
