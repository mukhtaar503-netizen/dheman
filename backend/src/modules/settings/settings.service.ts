import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/utils/audit';
import { AuthUser } from '@/middleware/auth';

const DEFAULTS = { name: 'Dheeman Decoration And Furniture' };

/** There is always exactly one CompanySettings row; it is created lazily on first read. */
export async function getSettings() {
  const existing = await prisma.companySettings.findFirst();
  if (existing) return existing;
  return prisma.companySettings.create({ data: DEFAULTS });
}

export async function updateSettings(actor: AuthUser, input: Record<string, unknown>) {
  const before = await getSettings();
  const settings = await prisma.companySettings.update({ where: { id: before.id }, data: input as any });
  await recordAudit({
    actorId: actor.id,
    action: 'UPDATE',
    entityType: 'CompanySettings',
    entityId: settings.id,
    before,
    after: settings,
  });
  return settings;
}
