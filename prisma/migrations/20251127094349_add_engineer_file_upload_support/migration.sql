-- AlterTable
ALTER TABLE "File" ADD COLUMN     "documentType" TEXT,
ADD COLUMN     "fileSize" INTEGER,
ADD COLUMN     "uploadedByEngineerId" INTEGER,
ALTER COLUMN "uploadedBy" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "File_uploadedByEngineerId_idx" ON "File"("uploadedByEngineerId");

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_uploadedByEngineerId_fkey" FOREIGN KEY ("uploadedByEngineerId") REFERENCES "engineers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
