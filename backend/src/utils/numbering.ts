import { prisma } from '@/lib/prisma';

/**
 * Generates sequential, human-readable reference numbers such as QT-2026-00042.
 *
 * Backed by ReferenceCounter, a one-row-per-"PREFIX-YEAR" counter. Two-path strategy so the
 * common case costs exactly one atomic query:
 *
 *  - Fast path (used for every call once a prefix+year has been seen before, i.e. virtually
 *    always): a single `UPDATE ... RETURNING` atomically increments the existing row. Postgres
 *    row-locks the row for the statement, so concurrent callers can never be handed the same
 *    value.
 *  - Slow path (only the very first time a given prefix+year key is used — once per prefix per
 *    year, not once per call): seed the counter from the historical row count for that year
 *    (every prior number 1..count is already taken, so count+1 is guaranteed free), then
 *    `INSERT ... ON CONFLICT DO UPDATE ... RETURNING`. The ON CONFLICT branch means even if two
 *    requests race on this same first-ever bootstrap, only one of them actually sets the seed —
 *    the other correctly falls through to an atomic increment on top of it, so no two callers
 *    can ever receive the same number here either.
 *
 * Replaces the previous scheme (count existing rows for the year, add 1, on every call), which
 * raced under concurrent creates: two near-simultaneous requests could both count N rows and
 * both compute N+1, and the second insert would fail with a raw unique-constraint violation
 * instead of ever reaching the caller's own business-rule checks.
 */
export async function generateReferenceNumber(
  prefix: string,
  model: 'serviceRequest' | 'quotation' | 'project' | 'invoice' | 'siteInspection',
): Promise<string> {
  const year = new Date().getFullYear();
  const key = `${prefix}-${year}`;

  const incremented = await prisma.$queryRaw<{ value: number }[]>`
    UPDATE "ReferenceCounter" SET "value" = "value" + 1 WHERE "key" = ${key} RETURNING "value"
  `;
  if (incremented.length > 0) {
    return `${prefix}-${year}-${String(incremented[0].value).padStart(5, '0')}`;
  }

  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
  const endOfYear = new Date(`${year + 1}-01-01T00:00:00.000Z`);
  const seedCount = await (prisma[model] as any).count({
    where: { createdAt: { gte: startOfYear, lt: endOfYear } },
  });

  const seeded = await prisma.$queryRaw<{ value: number }[]>`
    INSERT INTO "ReferenceCounter" ("key", "value")
    VALUES (${key}, ${seedCount + 1})
    ON CONFLICT ("key") DO UPDATE SET "value" = "ReferenceCounter"."value" + 1
    RETURNING "value"
  `;
  return `${prefix}-${year}-${String(seeded[0].value).padStart(5, '0')}`;
}
