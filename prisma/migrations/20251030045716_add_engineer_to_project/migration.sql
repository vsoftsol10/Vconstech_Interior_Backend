-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "assignedEngineerId" INTEGER,
ADD COLUMN     "location" TEXT;

-- CreateIndex
CREATE INDEX "Project_assignedEngineerId_idx" ON "Project"("assignedEngineerId");

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_assignedEngineerId_fkey" FOREIGN KEY ("assignedEngineerId") REFERENCES "engineers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
