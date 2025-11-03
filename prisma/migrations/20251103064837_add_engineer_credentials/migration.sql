/*
  Warnings:

  - A unique constraint covering the columns `[username,companyId]` on the table `engineers` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "engineers" ADD COLUMN     "password" TEXT,
ADD COLUMN     "username" TEXT;

-- CreateIndex
CREATE INDEX "engineers_username_idx" ON "engineers"("username");

-- CreateIndex
CREATE UNIQUE INDEX "engineers_username_companyId_key" ON "engineers"("username", "companyId");
