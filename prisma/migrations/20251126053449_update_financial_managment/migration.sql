-- AlterTable
ALTER TABLE "FinancialTransaction" ADD COLUMN     "category" TEXT;

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "dueDate" TIMESTAMP(3),
ADD COLUMN     "quotationAmount" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "ProjectExpense" (
    "id" SERIAL NOT NULL,
    "projectId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectExpense_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectExpense_projectId_idx" ON "ProjectExpense"("projectId");

-- CreateIndex
CREATE INDEX "ProjectExpense_category_idx" ON "ProjectExpense"("category");

-- CreateIndex
CREATE INDEX "FinancialTransaction_category_idx" ON "FinancialTransaction"("category");

-- AddForeignKey
ALTER TABLE "ProjectExpense" ADD CONSTRAINT "ProjectExpense_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
