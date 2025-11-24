/*
  Warnings:

  - A unique constraint covering the columns `[userId]` on the table `engineers` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "engineers" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "engineers_userId_key" ON "engineers"("userId");

-- CreateIndex
CREATE INDEX "engineers_userId_idx" ON "engineers"("userId");

-- AddForeignKey
ALTER TABLE "engineers" ADD CONSTRAINT "engineers_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
