-- Supports the redesigned quotation/inspection PDF header (centered two-line company name,
-- subtitle, and phone line under the divider). Updates the single CompanySettings row's
-- name/tagline/phone to the values the new header design expects, without touching a value
-- an admin has already customized away from every known previous placeholder/seed default.
UPDATE "CompanySettings"
SET "name" = 'Dheeman Decoration and Furniture Solution'
WHERE trim(lower("name")) IN ('my company', 'dheeman decoration and furniture');

UPDATE "CompanySettings"
SET "tagline" = 'Aluminum • Furniture • Gypsum & PVC Installation Services'
WHERE "tagline" IS NULL OR "tagline" = 'Professional Decoration & Installation Services';

UPDATE "CompanySettings"
SET "phone" = '063-3731036 / 063-3231553'
WHERE "phone" IS NULL;
