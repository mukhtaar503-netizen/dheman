-- Follow-up to 20260808180000_company_name_branding_fix: that migration only matched the
-- exact strings "My Company" / "Dheeman Decoration and Furniture Solution". This widens the
-- match to be case-insensitive and whitespace-tolerant, so any lingering placeholder value
-- (extra spaces, different casing) on the single CompanySettings row is still caught, without
-- touching a name an admin has genuinely customized to something else.
UPDATE "CompanySettings"
SET "name" = 'Dheeman Decoration And Furniture'
WHERE trim(lower("name")) IN ('my company', 'dheeman decoration and furniture solution');
