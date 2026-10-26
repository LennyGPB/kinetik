-- Templates masqués / populaires, réglés depuis l'admin
CREATE TABLE "TemplateSetting" (
  "kind" TEXT NOT NULL,
  "templateId" TEXT NOT NULL,
  "hidden" BOOLEAN NOT NULL DEFAULT false,
  "popular" BOOLEAN NOT NULL DEFAULT false,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "TemplateSetting_pkey" PRIMARY KEY ("kind", "templateId")
);
