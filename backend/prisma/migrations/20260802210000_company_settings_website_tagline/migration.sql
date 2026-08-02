-- Quotation letterhead: CompanySettings gains a tagline and website field,
-- both nullable/additive so existing rows are unaffected.

-- AlterTable
ALTER TABLE "CompanySettings" ADD COLUMN     "tagline" TEXT,
ADD COLUMN     "website" TEXT;
