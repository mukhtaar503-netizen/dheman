-- Performance indexes for frequently-filtered/joined columns identified in the perf audit.

-- CreateIndex
CREATE INDEX "Expense_date_idx" ON "Expense"("date");

-- CreateIndex
CREATE INDEX "Invoice_customerId_idx" ON "Invoice"("customerId");

-- CreateIndex
CREATE INDEX "Invoice_projectId_idx" ON "Invoice"("projectId");

-- CreateIndex
CREATE INDEX "Payment_customerId_idx" ON "Payment"("customerId");

-- CreateIndex
CREATE INDEX "Payment_paidAt_idx" ON "Payment"("paidAt");

-- CreateIndex
CREATE INDEX "Project_customerId_idx" ON "Project"("customerId");

-- CreateIndex
CREATE INDEX "Project_projectManagerId_idx" ON "Project"("projectManagerId");

-- CreateIndex
CREATE INDEX "Quotation_customerId_idx" ON "Quotation"("customerId");

-- CreateIndex
CREATE INDEX "Quotation_serviceRequestId_idx" ON "Quotation"("serviceRequestId");

-- CreateIndex
CREATE INDEX "ServiceRequest_customerId_idx" ON "ServiceRequest"("customerId");

-- CreateIndex
CREATE INDEX "SiteInspection_inspectorId_idx" ON "SiteInspection"("inspectorId");

-- CreateIndex
CREATE INDEX "TaskAssignment_technicianId_idx" ON "TaskAssignment"("technicianId");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");
