-- PHASE 07: Quotation Management module extension.
-- Adds cost-breakdown/estimation fields, an optional link to the originating Site
-- Inspection, a dedicated customer approval-decision record, and item categorization
-- (material/labor/transportation) so the existing line-item-driven Quotation system
-- can auto-populate from inspection estimates and compute the cost buckets the spec
-- requires without duplicating the subtotal/tax/discount engine already in place.

-- CreateEnum
CREATE TYPE "QuotationItemCategory" AS ENUM ('MATERIAL', 'LABOR', 'TRANSPORTATION');

-- CreateEnum
CREATE TYPE "QuotationApprovalAction" AS ENUM ('APPROVED', 'REJECTED');

-- AlterEnum
ALTER TYPE "QuotationStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT;

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "description" TEXT,
ADD COLUMN     "discountAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "emailSentAt" TIMESTAMP(3),
ADD COLUMN     "emailStatus" TEXT,
ADD COLUMN     "laborCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "materialCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "siteInspectionId" TEXT,
ADD COLUMN     "termsAndConditions" TEXT,
ADD COLUMN     "title" TEXT,
ADD COLUMN     "transportationCost" DECIMAL(12,2) NOT NULL DEFAULT 0,
ADD COLUMN     "validityDays" INTEGER;

-- AlterTable
ALTER TABLE "QuotationLineItem" ADD COLUMN     "category" "QuotationItemCategory" NOT NULL DEFAULT 'MATERIAL',
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "itemName" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "QuotationApproval" (
    "id" TEXT NOT NULL,
    "quotationId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "action" "QuotationApprovalAction" NOT NULL,
    "comments" TEXT,
    "approvedDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuotationApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "QuotationApproval_quotationId_idx" ON "QuotationApproval"("quotationId");

-- CreateIndex
CREATE INDEX "Quotation_siteInspectionId_idx" ON "Quotation"("siteInspectionId");

-- CreateIndex
CREATE INDEX "QuotationLineItem_category_idx" ON "QuotationLineItem"("category");

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_siteInspectionId_fkey" FOREIGN KEY ("siteInspectionId") REFERENCES "SiteInspection"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationApproval" ADD CONSTRAINT "QuotationApproval_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuotationApproval" ADD CONSTRAINT "QuotationApproval_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
