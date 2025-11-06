/*
  Warnings:

  - A unique constraint covering the columns `[projectId,companyId]` on the table `Project` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "public"."Project_projectId_key";

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectId_companyId_key" ON "Project"("projectId", "companyId");
