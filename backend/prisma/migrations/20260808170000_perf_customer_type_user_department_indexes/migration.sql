-- Performance audit follow-up: Customer.type and User.department are filtered on
-- (list endpoints) and grouped by (statistics endpoints) but had no supporting index.
CREATE INDEX "Customer_type_idx" ON "Customer"("type");
CREATE INDEX "User_department_idx" ON "User"("department");
