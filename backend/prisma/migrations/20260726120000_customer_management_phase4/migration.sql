-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "PreferredContactMethod" AS ENUM ('PHONE', 'EMAIL', 'SMS', 'WHATSAPP');

-- CreateEnum
CREATE TYPE "CustomerSource" AS ENUM ('WALK_IN', 'REFERRAL', 'WEBSITE', 'SOCIAL_MEDIA', 'ADVERTISEMENT', 'PHONE_INQUIRY', 'OTHER');

-- CreateEnum
CREATE TYPE "CustomerNoteVisibility" AS ENUM ('INTERNAL', 'PUBLIC');

-- CreateEnum
CREATE TYPE "CustomerDocumentCategory" AS ENUM ('CONTRACT', 'INVOICE', 'PHOTO', 'DRAWING', 'RECEIPT', 'WARRANTY', 'IDENTITY', 'OTHER');

-- AlterEnum
ALTER TYPE "CustomerStatus" ADD VALUE 'BLOCKED';

-- AlterTable
-- customerCode is added nullable first and backfilled below (from sequenceNo) before
-- being made NOT NULL, so this migration is safe to run against a Customer table that
-- already has rows (sequenceNo's SERIAL default backfills existing rows automatically).
ALTER TABLE "Customer" ADD COLUMN     "alternatePhone" TEXT,
ADD COLUMN     "assignedTechnicianId" TEXT,
ADD COLUMN     "customerCode" TEXT,
ADD COLUMN     "dateOfBirth" TIMESTAMP(3),
ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "deletedById" TEXT,
ADD COLUMN     "gender" "Gender",
ADD COLUMN     "nationalId" TEXT,
ADD COLUMN     "preferredContactMethod" "PreferredContactMethod" NOT NULL DEFAULT 'PHONE',
ADD COLUMN     "sequenceNo" SERIAL NOT NULL,
ADD COLUMN     "source" "CustomerSource" NOT NULL DEFAULT 'OTHER';

UPDATE "Customer" SET "customerCode" = 'CUS-' || LPAD("sequenceNo"::text, 6, '0') WHERE "customerCode" IS NULL;

ALTER TABLE "Customer" ALTER COLUMN "customerCode" SET NOT NULL;

-- AlterTable
-- updatedAt backfilled to now() for any pre-existing notes; new rows are always
-- written with an explicit value by Prisma's @updatedAt handling.
ALTER TABLE "CustomerNote" ADD COLUMN     "attachments" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "visibility" "CustomerNoteVisibility" NOT NULL DEFAULT 'INTERNAL';

-- AlterTable
ALTER TABLE "CustomerSiteAddress" ADD COLUMN     "building" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "district" TEXT,
ADD COLUMN     "isDefault" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "landmark" TEXT,
ADD COLUMN     "mapLocation" TEXT,
ADD COLUMN     "postalCode" TEXT,
ADD COLUMN     "region" TEXT,
ADD COLUMN     "street" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "CustomerContact" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerDocument" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "category" "CustomerDocumentCategory" NOT NULL DEFAULT 'OTHER',
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "version" INTEGER NOT NULL DEFAULT 1,
    "replacesId" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomerContact_customerId_idx" ON "CustomerContact"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerDocument_replacesId_key" ON "CustomerDocument"("replacesId");

-- CreateIndex
CREATE INDEX "CustomerDocument_customerId_idx" ON "CustomerDocument"("customerId");

-- CreateIndex
CREATE INDEX "CustomerDocument_category_idx" ON "CustomerDocument"("category");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_sequenceNo_key" ON "Customer"("sequenceNo");

-- CreateIndex
CREATE UNIQUE INDEX "Customer_customerCode_key" ON "Customer"("customerCode");

-- CreateIndex
CREATE INDEX "Customer_deletedAt_idx" ON "Customer"("deletedAt");

-- CreateIndex
CREATE INDEX "Customer_assignedTechnicianId_idx" ON "Customer"("assignedTechnicianId");

-- CreateIndex
CREATE INDEX "Customer_createdAt_idx" ON "Customer"("createdAt");

-- CreateIndex
CREATE INDEX "CustomerNote_customerId_idx" ON "CustomerNote"("customerId");

-- CreateIndex
CREATE INDEX "CustomerSiteAddress_customerId_idx" ON "CustomerSiteAddress"("customerId");

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_deletedById_fkey" FOREIGN KEY ("deletedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Customer" ADD CONSTRAINT "Customer_assignedTechnicianId_fkey" FOREIGN KEY ("assignedTechnicianId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerContact" ADD CONSTRAINT "CustomerContact_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerNote" ADD CONSTRAINT "CustomerNote_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDocument" ADD CONSTRAINT "CustomerDocument_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDocument" ADD CONSTRAINT "CustomerDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerDocument" ADD CONSTRAINT "CustomerDocument_replacesId_fkey" FOREIGN KEY ("replacesId") REFERENCES "CustomerDocument"("id") ON DELETE SET NULL ON UPDATE CASCADE;

