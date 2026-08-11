-- AlterTable
-- Drops 8 SiteInspection columns confirmed unused by any remaining business logic
-- after removing every reader/writer of them from the application (backend service,
-- validation, PDF report, frontend forms). Scoped to exactly these columns on exactly
-- this table — no other tables or columns are touched.
ALTER TABLE "SiteInspection" DROP COLUMN "customerRequirements",
DROP COLUMN "existingSiteCondition",
DROP COLUMN "inspectionPurpose",
DROP COLUMN "internalNotes",
DROP COLUMN "landmark",
DROP COLUMN "latitude",
DROP COLUMN "longitude",
DROP COLUMN "technicalNotes";
