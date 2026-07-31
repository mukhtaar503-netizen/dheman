-- PHASE 06: Service Requests & Site Inspection extension.
-- Adds priority/title/serviceId/projectLocation/preferredDate to ServiceRequest,
-- adds technical assessment + material/labor estimation fields to SiteInspection,
-- and fills workflow gaps in ServiceRequestStatus/InspectionStatus/NotificationType.

-- CreateEnum
CREATE TYPE "ServiceRequestPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- AlterEnum
ALTER TYPE "InspectionStatus" ADD VALUE 'IN_PROGRESS';

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'INSPECTION_COMPLETED';

-- AlterEnum
-- Adds two new terminal/interim states used by the extended Service Request workflow.
ALTER TYPE "ServiceRequestStatus" ADD VALUE 'INSPECTION_COMPLETED';
ALTER TYPE "ServiceRequestStatus" ADD VALUE 'CANCELLED';

-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "preferredDate" TIMESTAMP(3),
ADD COLUMN     "priority" "ServiceRequestPriority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "projectLocation" TEXT,
ADD COLUMN     "serviceId" TEXT,
ADD COLUMN     "title" TEXT;

-- AlterTable
ALTER TABLE "SiteInspection" ADD COLUMN     "estimatedCost" DECIMAL(12,2),
ADD COLUMN     "estimatedDuration" TEXT,
ADD COLUMN     "laborEstimate" JSONB,
ADD COLUMN     "materialEstimate" JSONB,
ADD COLUMN     "technicalNotes" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "ServiceRequest_priority_idx" ON "ServiceRequest"("priority");

-- CreateIndex
CREATE INDEX "ServiceRequest_serviceId_idx" ON "ServiceRequest"("serviceId");

-- CreateIndex
CREATE INDEX "SiteInspection_status_idx" ON "SiteInspection"("status");

-- AddForeignKey
ALTER TABLE "ServiceRequest" ADD CONSTRAINT "ServiceRequest_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE;
