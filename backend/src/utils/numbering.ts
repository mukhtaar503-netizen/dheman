import { prisma } from '@/lib/prisma';

/**
 * Generates sequential, human-readable reference numbers such as SR-2026-00042.
 * Sequence is scoped per prefix per year by counting existing rows for the
 * current year — acceptable at V1 scale; revisit with a dedicated sequence
 * table if concurrent write volume grows.
 */
export async function generateReferenceNumber(
  prefix: string,
  model: 'serviceRequest' | 'quotation' | 'project' | 'invoice',
): Promise<string> {
  const year = new Date().getFullYear();
  const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
  const endOfYear = new Date(`${year + 1}-01-01T00:00:00.000Z`);

  const count = await (prisma[model] as any).count({
    where: { createdAt: { gte: startOfYear, lt: endOfYear } },
  });

  const sequence = String(count + 1).padStart(5, '0');
  return `${prefix}-${year}-${sequence}`;
}
