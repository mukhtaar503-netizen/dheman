-- PHASE 06 FINAL: SiteInspection location + cost-summary fields.
-- All nullable/additive — filled in by the inspector during/after the visit.

-- AlterTable
ALTER TABLE "SiteInspection" ADD COLUMN     "laborCost" DECIMAL(12,2),
ADD COLUMN     "latitude" DECIMAL(9,6),
ADD COLUMN     "longitude" DECIMAL(9,6),
ADD COLUMN     "materialCost" DECIMAL(12,2),
ADD COLUMN     "siteAddress" TEXT,
ADD COLUMN     "transportationCost" DECIMAL(12,2);
