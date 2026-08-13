-- Backs the atomic reference-number generator (src/utils/numbering.ts). One row per
-- "PREFIX-YEAR" key, incremented via INSERT ... ON CONFLICT DO UPDATE ... RETURNING so
-- concurrent creates (e.g. two quotations submitted at nearly the same time) can never be
-- handed the same sequence number, which the previous count()-based scheme allowed.
CREATE TABLE "ReferenceCounter" (
    "key" TEXT NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ReferenceCounter_pkey" PRIMARY KEY ("key")
);
