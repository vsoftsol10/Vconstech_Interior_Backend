/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Company` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[projectId]` on the table `Project` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[projectId,userId]` on the table `ProjectAssignment` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `clientName` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectId` to the `Project` table without a default value. This is not possible if the table is not empty.
  - Added the required column `projectType` to the `Project` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."Contract" DROP CONSTRAINT "Contract_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."File" DROP CONSTRAINT "File_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."File" DROP CONSTRAINT "File_uploadedBy_fkey";

-- DropForeignKey
ALTER TABLE "public"."FinancialTransaction" DROP CONSTRAINT "FinancialTransaction_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Material" DROP CONSTRAINT "Material_companyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MaterialUsage" DROP CONSTRAINT "MaterialUsage_materialId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MaterialUsage" DROP CONSTRAINT "MaterialUsage_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."MaterialUsage" DROP CONSTRAINT "MaterialUsage_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Project" DROP CONSTRAINT "Project_companyId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProjectAssignment" DROP CONSTRAINT "ProjectAssignment_projectId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProjectAssignment" DROP CONSTRAINT "ProjectAssignment_userId_fkey";

-- DropForeignKey
ALTER TABLE "public"."User" DROP CONSTRAINT "User_companyId_fkey";

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "budget" DOUBLE PRECISION,
ADD COLUMN     "clientName" TEXT NOT NULL,
ADD COLUMN     "projectId" TEXT NOT NULL,
ADD COLUMN     "projectType" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Company_name_key" ON "Company"("name");

-- CreateIndex
CREATE INDEX "Contract_projectId_idx" ON "Contract"("projectId");

-- CreateIndex
CREATE INDEX "File_projectId_idx" ON "File"("projectId");

-- CreateIndex
CREATE INDEX "File_uploadedBy_idx" ON "File"("uploadedBy");

-- CreateIndex
CREATE INDEX "FinancialTransaction_projectId_idx" ON "FinancialTransaction"("projectId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_type_idx" ON "FinancialTransaction"("type");

-- CreateIndex
CREATE INDEX "FinancialTransaction_date_idx" ON "FinancialTransaction"("date");

-- CreateIndex
CREATE INDEX "Material_companyId_idx" ON "Material"("companyId");

-- CreateIndex
CREATE INDEX "MaterialUsage_projectId_idx" ON "MaterialUsage"("projectId");

-- CreateIndex
CREATE INDEX "MaterialUsage_materialId_idx" ON "MaterialUsage"("materialId");

-- CreateIndex
CREATE INDEX "MaterialUsage_userId_idx" ON "MaterialUsage"("userId");

-- CreateIndex
CREATE INDEX "MaterialUsage_date_idx" ON "MaterialUsage"("date");

-- CreateIndex
CREATE UNIQUE INDEX "Project_projectId_key" ON "Project"("projectId");

-- CreateIndex
CREATE INDEX "Project_companyId_idx" ON "Project"("companyId");

-- CreateIndex
CREATE INDEX "Project_projectId_idx" ON "Project"("projectId");

-- CreateIndex
CREATE INDEX "Project_status_idx" ON "Project"("status");

-- CreateIndex
CREATE INDEX "ProjectAssignment_projectId_idx" ON "ProjectAssignment"("projectId");

-- CreateIndex
CREATE INDEX "ProjectAssignment_userId_idx" ON "ProjectAssignment"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectAssignment_projectId_userId_key" ON "ProjectAssignment"("projectId", "userId");

-- CreateIndex
CREATE INDEX "User_companyId_idx" ON "User"("companyId");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectAssignment" ADD CONSTRAINT "ProjectAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Material" ADD CONSTRAINT "Material_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialUsage" ADD CONSTRAINT "MaterialUsage_materialId_fkey" FOREIGN KEY ("materialId") REFERENCES "Material"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialUsage" ADD CONSTRAINT "MaterialUsage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialUsage" ADD CONSTRAINT "MaterialUsage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
