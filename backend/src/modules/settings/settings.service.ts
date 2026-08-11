import { prisma } from '@/lib/prisma';
import { recordAudit } from '@/utils/audit';
import { AuthUser } from '@/middleware/auth';

const DEFAULTS = {
  name: 'Dheeman Decoration and Furniture Solution',
  tagline: 'Aluminum • Furniture • Gypsum & PVC Installation Services',
  phone: '063-3731036 / 063-3231553',
};

// CompanySettings is read on nearly every quotation/invoice/expense calculation and every
// generated PDF, but changes rarely (an admin editing tax rate / branding, not a per-request
// event). Cached in-process and invalidated explicitly on every updateSettings() write, so
// readers never see a stale value after this instance performs an update — the TTL below is
// only a safety net for a multi-instance deployment where another process's write wouldn't
// otherwise invalidate this instance's cache.
const SETTINGS_CACHE_TTL_MS = 30_000;
let settingsCache: { data: Awaited<ReturnType<typeof prisma.companySettings.findFirst>>; expiresAt: number } | null = null;

/** There is always exactly one CompanySettings row; it is created lazily on first read. */
export async function getSettings() {
  if (settingsCache && settingsCache.expiresAt > Date.now() && settingsCache.data) return settingsCache.data;

  const existing = await prisma.companySettings.findFirst();
  const settings = existing ?? (await prisma.companySettings.create({ data: DEFAULTS }));
  settingsCache = { data: settings, expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS };
  return settings;
}

export async function updateSettings(actor: AuthUser, input: Record<string, unknown>) {
  const before = await getSettings();
  const settings = await prisma.companySettings.update({ where: { id: before.id }, data: input as any });
  settingsCache = { data: settings, expiresAt: Date.now() + SETTINGS_CACHE_TTL_MS };
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
