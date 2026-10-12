-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "shareToken" TEXT,
ADD COLUMN     "sourceProjectId" TEXT;

-- AlterTable
ALTER TABLE "Render" ADD COLUMN     "bucketName" TEXT,
ADD COLUMN     "lambdaRenderId" TEXT,
ADD COLUMN     "outputKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Project_shareToken_key" ON "Project"("shareToken");

