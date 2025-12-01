-- CreateTable
CREATE TABLE "Labour" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address" TEXT,
    "companyId" TEXT NOT NULL,
    "projectId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Labour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LabourPayment" (
    "id" SERIAL NOT NULL,
    "labourId" INTEGER NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "remarks" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LabourPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Labour_companyId_idx" ON "Labour"("companyId");

-- CreateIndex
CREATE INDEX "Labour_projectId_idx" ON "Labour"("projectId");

-- CreateIndex
CREATE INDEX "Labour_phone_idx" ON "Labour"("phone");

-- CreateIndex
CREATE INDEX "LabourPayment_labourId_idx" ON "LabourPayment"("labourId");

-- CreateIndex
CREATE INDEX "LabourPayment_date_idx" ON "LabourPayment"("date");

-- AddForeignKey
ALTER TABLE "Labour" ADD CONSTRAINT "Labour_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Labour" ADD CONSTRAINT "Labour_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LabourPayment" ADD CONSTRAINT "LabourPayment_labourId_fkey" FOREIGN KEY ("labourId") REFERENCES "Labour"("id") ON DELETE CASCADE ON UPDATE CASCADE;
