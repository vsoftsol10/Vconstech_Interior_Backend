/*
  Warnings:

  - You are about to drop the column `userId` on the `MaterialUsage` table. All the data in the column will be lost.
  - Added the required column `engineerId` to the `MaterialUsage` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "public"."MaterialUsage" DROP CONSTRAINT "MaterialUsage_userId_fkey";

-- DropIndex
DROP INDEX "public"."MaterialUsage_userId_idx";

-- AlterTable
ALTER TABLE "MaterialUsage" DROP COLUMN "userId",
ADD COLUMN     "engineerId" INTEGER NOT NULL;

-- CreateIndex
CREATE INDEX "MaterialUsage_engineerId_idx" ON "MaterialUsage"("engineerId");

-- AddForeignKey
ALTER TABLE "MaterialUsage" ADD CONSTRAINT "MaterialUsage_engineerId_fkey" FOREIGN KEY ("engineerId") REFERENCES "engineers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
