-- Duplicate-customer detection is entirely app-level (customers.service.ts createCustomer),
-- with an explicit `allowDuplicate` override for staff who deliberately want to create a
-- customer that shares a phone/email with an existing one. A hard DB-level unique
-- constraint on (phone, email) contradicted that: it couldn't be overridden, so it turned
-- a deliberate "create anyway" action into an unhandled 500 whenever the phone+email pair
-- exactly matched an existing customer.
DROP INDEX "Customer_phone_email_key";
