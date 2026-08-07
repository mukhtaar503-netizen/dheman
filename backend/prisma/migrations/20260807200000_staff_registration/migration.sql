-- CreateEnum
CREATE TYPE "StaffResponsibility" AS ENUM ('SUPERVISOR', 'TECHNICIAN', 'INSTALLER', 'ELECTRICIAN', 'CARPENTER', 'PLUMBER', 'PAINTER', 'DRIVER', 'HELPER', 'OTHER');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "department" TEXT,
ADD COLUMN     "employeeId" TEXT;

-- CreateTable
CREATE TABLE "ProjectStaffAssignment" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "responsibility" "StaffResponsibility" NOT NULL,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "notes" TEXT,
    "assignedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProjectStaffAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProjectStaffAssignment_projectId_idx" ON "ProjectStaffAssignment"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectStaffAssignment_projectId_userId_key" ON "ProjectStaffAssignment"("projectId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "User_employeeId_key" ON "User"("employeeId");

-- AddForeignKey
ALTER TABLE "ProjectStaffAssignment" ADD CONSTRAINT "ProjectStaffAssignment_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStaffAssignment" ADD CONSTRAINT "ProjectStaffAssignment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectStaffAssignment" ADD CONSTRAINT "ProjectStaffAssignment_assignedById_fkey" FOREIGN KEY ("assignedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
