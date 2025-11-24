/*
  Warnings:

  - You are about to drop the column `userId` on the `engineers` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."engineers" DROP CONSTRAINT "engineers_userId_fkey";

-- DropIndex
DROP INDEX "public"."engineers_userId_idx";

-- DropIndex
DROP INDEX "public"."engineers_userId_key";

-- AlterTable
ALTER TABLE "engineers" DROP COLUMN "userId";
