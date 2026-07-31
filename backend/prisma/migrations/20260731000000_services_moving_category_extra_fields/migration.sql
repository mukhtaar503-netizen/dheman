-- AlterEnum
ALTER TYPE "ServiceCategoryGroup" ADD VALUE 'MOVING';

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "displayOrder" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "features" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "notes" TEXT;

-- CreateIndex
CREATE INDEX "Service_displayOrder_idx" ON "Service"("displayOrder");
