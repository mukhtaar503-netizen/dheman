import { prisma } from '@/lib/prisma';

/**
 * Generates sequential, human-readable reference numbers such as QT-2026-00042.
 *
 * Backed by ReferenceCounter, a one-row-per-"PREFIX-YEAR" counter incremented with a single
 * atomic `INSERT ... ON CONFLICT DO UPDATE ... RETURNING` statement. Postgres takes a row lock
 * for the duration of that statement, so two concurrent callers can never be handed the same
 * value — unlike the previous scheme (count existing rows for the year, add 1), which raced
 * under concurrent creates: two near-simultaneous requests could both count N rows and both
 * compute N+1, and the second insert would fail with a raw unique-constraint violation on the
 * generated number instead of ever reaching the caller's own business-rule checks.
 *
 * The seed (used only the first time a given prefix+year key is created) reuses the old
 * count-based value so numbering picks up exactly where any pre-existing rows left off —
 * every prior number 1..count is already taken, so count+1 is guaranteed free for the seed.
 * Once the counter row exists, the seed argument is ignored (ON CONFLICT DO UPDATE wins) and
 * every call is a pure atomic increment.
 */
export async function generateReferenceNumber(
  prefix: string,
  model: 'serviceRequest' | 'quotation' | 'project' | 'invoice' | 'siteInspection',
): Promise<string> {
  const year = new Date().getFullYear();
  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
  const endOfYear = new Date(`${year + 1}-01-01T00:00:00.000Z`);
  const key = `${prefix}-${year}`;

  const seedCount = await (prisma[model] as any).count({
    where: { createdAt: { gte: startOfYear, lt: endOfYear } },
  });

  const rows = await prisma.$queryRaw<{ value: number }[]>`
    INSERT INTO "ReferenceCounter" ("key", "value")
    VALUES (${key}, ${seedCount + 1})
    ON CONFLICT ("key") DO UPDATE SET "value" = "ReferenceCounter"."value" + 1
    RETURNING "value"
  `;

  const sequence = String(rows[0].value).padStart(5, '0');
  return `${prefix}-${year}-${sequence}`;
}
