-- Split into its own migration: Postgres forbids using a newly-added enum value (as a
-- column default, in this case) within the same transaction that added it, so PENDING
-- must be committed here before the next migration can default SiteInspection.status to it.

-- AlterEnum
ALTER TYPE "InspectionStatus" ADD VALUE 'PENDING';
