-- DropIndex
DROP INDEX "Quotation_siteInspectionId_idx";

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_siteInspectionId_key" ON "Quotation"("siteInspectionId");
