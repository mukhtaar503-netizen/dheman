-- PHASE 06 — Site Inspection Registration Module.
-- ServiceRequest gains pre-sales "project information" fields, SiteInspection gains a
-- unique auto-generated inspection number + defaults to the (now-committed) PENDING
-- status + the registration fields from the spec (site/purpose/requirements/condition/
-- internal notes, labor and transportation assessments), InspectionMeasurement gains
-- quantity/notes, and InspectionPhoto is generalized to any attachment type (photo/
-- video/drawing/document).

-- CreateEnum
CREATE TYPE "AttachmentType" AS ENUM ('PHOTO', 'VIDEO', 'DRAWING', 'DOCUMENT');

-- AlterTable
ALTER TABLE "InspectionMeasurement" ADD COLUMN     "notes" TEXT,
ADD COLUMN     "quantity" INTEGER DEFAULT 1;

-- AlterTable
ALTER TABLE "InspectionPhoto" ADD COLUMN     "fileType" "AttachmentType" NOT NULL DEFAULT 'PHOTO';

-- AlterTable
ALTER TABLE "ServiceRequest" ADD COLUMN     "expectedCompletionDate" TIMESTAMP(3),
ADD COLUMN     "expectedStartDate" TIMESTAMP(3),
ADD COLUMN     "projectType" TEXT;

-- AlterTable
-- inspectionNo is added nullable first, backfilled below for any pre-existing rows, then
-- locked to NOT NULL — new rows always supply it via generateReferenceNumber('INS', ...).
ALTER TABLE "SiteInspection" ADD COLUMN     "accessibility" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "customerRequirements" TEXT,
ADD COLUMN     "estimatedWorkers" INTEGER,
ADD COLUMN     "estimatedWorkingDays" INTEGER,
ADD COLUMN     "existingSiteCondition" TEXT,
ADD COLUMN     "inspectionNo" TEXT,
ADD COLUMN     "inspectionPurpose" TEXT,
ADD COLUMN     "internalNotes" TEXT,
ADD COLUMN     "landmark" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "specialSkillsRequired" TEXT,
ADD COLUMN     "transportDistance" DECIMAL(8,2),
ADD COLUMN     "transportationNotes" TEXT,
ADD COLUMN     "vehicleRequired" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

WITH numbered AS (
  SELECT id,
         EXTRACT(YEAR FROM "createdAt")::int AS yr,
         ROW_NUMBER() OVER (PARTITION BY EXTRACT(YEAR FROM "createdAt") ORDER BY "createdAt") AS seq
  FROM "SiteInspection"
)
UPDATE "SiteInspection" si
SET "inspectionNo" = 'INS-' || numbered.yr || '-' || LPAD(numbered.seq::text, 5, '0')
FROM numbered
WHERE si.id = numbered.id;

ALTER TABLE "SiteInspection" ALTER COLUMN "inspectionNo" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "SiteInspection_inspectionNo_key" ON "SiteInspection"("inspectionNo");
