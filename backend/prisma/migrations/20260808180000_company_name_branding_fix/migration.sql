-- Corrects the company display name on any CompanySettings row still carrying the old
-- placeholder default ("My Company", set by the lazy-create fallback when no seed had run
-- yet) or the previous seeded wording, without touching rows an admin has already
-- customized to something else.
UPDATE "CompanySettings"
SET "name" = 'Dheeman Decoration And Furniture'
WHERE "name" IN ('My Company', 'Dheeman Decoration and Furniture Solution');
