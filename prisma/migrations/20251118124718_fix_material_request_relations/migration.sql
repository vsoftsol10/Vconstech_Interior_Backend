/*
  Warnings:

  - The `reviewedBy` column on the `MaterialRequest` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - You are about to drop the column `userId` on the `Notification` table. All the data in the column will be lost.
  - Changed the type of `employeeId` on the `MaterialRequest` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `engineerId` to the `Notification` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."MaterialRequest" DROP CONSTRAINT "MaterialRequest_employeeId_fkey";

-- DropForeignKey
ALTER TABLE "public"."Notification" DROP CONSTRAINT "Notification_userId_fkey";

-- DropIndex
DROP INDEX "public"."Notification_userId_idx";

-- AlterTable
ALTER TABLE "MaterialRequest" DROP COLUMN "employeeId",
ADD COLUMN     "employeeId" INTEGER NOT NULL,
DROP COLUMN "reviewedBy",
ADD COLUMN     "reviewedBy" INTEGER;

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "userId",
ADD COLUMN     "engineerId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "MaterialRequest_employeeId_idx" ON "MaterialRequest"("employeeId");

-- CreateIndex
CREATE INDEX "Notification_engineerId_idx" ON "Notification"("engineerId");

-- AddForeignKey
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "engineers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaterialRequest" ADD CONSTRAINT "MaterialRequest_reviewedBy_fkey" FOREIGN KEY ("reviewedBy") REFERENCES "engineers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_engineerId_fkey" FOREIGN KEY ("engineerId") REFERENCES "engineers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
