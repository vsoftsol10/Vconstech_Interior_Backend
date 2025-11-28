/*
  Warnings:

  - Added the required column `contactNumber` to the `Contract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `contractAmount` to the `Contract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `Contract` table without a default value. This is not possible if the table is not empty.
  - Added the required column `workStatus` to the `Contract` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "contactNumber" TEXT NOT NULL,
ADD COLUMN     "contractAmount" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "workStatus" TEXT NOT NULL;
