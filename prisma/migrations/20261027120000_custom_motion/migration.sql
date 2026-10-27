-- Claude privé : vidéos libres écrites depuis l'admin, publiées dans la galerie « Commu »
CREATE TABLE "CustomMotion" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "source" TEXT NOT NULL DEFAULT '',
  "compiled" TEXT NOT NULL DEFAULT '',
  "meta" JSONB NOT NULL DEFAULT '{}',
  "demo" JSONB NOT NULL DEFAULT '{}',
  "assets" JSONB NOT NULL DEFAULT '{}',
  "published" BOOLEAN NOT NULL DEFAULT false,
  "popular" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "CustomMotion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CustomMotionVersion" (
  "id" TEXT NOT NULL,
  "motionId" TEXT NOT NULL,
  "number" INTEGER NOT NULL,
  "source" TEXT NOT NULL,
  "compiled" TEXT NOT NULL,
  "meta" JSONB NOT NULL,
  "demo" JSONB NOT NULL,
  "assets" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomMotionVersion_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CustomMotionVersion_motionId_number_key" ON "CustomMotionVersion"("motionId", "number");
ALTER TABLE "CustomMotionVersion" ADD CONSTRAINT "CustomMotionVersion_motionId_fkey" FOREIGN KEY ("motionId") REFERENCES "CustomMotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "CustomMotionMessage" (
  "id" TEXT NOT NULL,
  "motionId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "source" TEXT,
  "meta" JSONB,
  "demo" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomMotionMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "CustomMotionMessage_motionId_createdAt_idx" ON "CustomMotionMessage"("motionId", "createdAt");
ALTER TABLE "CustomMotionMessage" ADD CONSTRAINT "CustomMotionMessage_motionId_fkey" FOREIGN KEY ("motionId") REFERENCES "CustomMotion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
