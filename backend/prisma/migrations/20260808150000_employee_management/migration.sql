-- CreateEnum
CREATE TYPE "EmployeeDocumentCategory" AS ENUM ('ID_CARD', 'CONTRACT', 'CERTIFICATE', 'RESUME', 'OTHER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "address" TEXT,
ADD COLUMN     "hireDate" TIMESTAMP(3),
ADD COLUMN     "jobTitle" TEXT,
ADD COLUMN     "photoUrl" TEXT;

-- CreateTable
CREATE TABLE "EmployeeDocument" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "EmployeeDocumentCategory" NOT NULL DEFAULT 'OTHER',
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EmployeeDocument_userId_idx" ON "EmployeeDocument"("userId");

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmployeeDocument" ADD CONSTRAINT "EmployeeDocument_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
