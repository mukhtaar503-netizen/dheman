import { prisma } from '@/lib/prisma';
import { HttpError } from '@/utils/http-error';
import { recordAudit } from '@/utils/audit';
import { AuthUser } from '@/middleware/auth';

// Service categories are read on nearly every service-request/quotation form (dropdown
// options) but change only through deliberate admin action (create/rename/deactivate), so
// they're an easy, safe caching candidate — small table, no per-user variation, explicitly
// invalidated on every write below rather than relying solely on the TTL.
const CATEGORY_CACHE_TTL_MS = 60_000;
const categoryCache = new Map<string, { data: unknown; expiresAt: number }>();

function clearCategoryCache() {
  categoryCache.clear();
}

export async function createCategory(actor: AuthUser, input: any) {
  const existing = await prisma.serviceCategory.findUnique({ where: { code: input.code } });
  if (existing) throw HttpError.conflict('A service category with this code already exists');

  const category = await prisma.serviceCategory.create({ data: input });
  clearCategoryCache();
  await recordAudit({ actorId: actor.id, action: 'CREATE', entityType: 'ServiceCategory', entityId: category.id, after: category });
  return category;
}

export async function listCategories(includeInactive = false) {
  const cacheKey = String(includeInactive);
  const cached = categoryCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const data = await prisma.serviceCategory.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { name: 'asc' },
  });
  categoryCache.set(cacheKey, { data, expiresAt: Date.now() + CATEGORY_CACHE_TTL_MS });
  return data;
}

export async function getCategoryById(id: string) {
  const category = await prisma.serviceCategory.findUnique({ where: { id } });
  if (!category) throw HttpError.notFound('Service category not found');
  return category;
}

export async function updateCategory(actor: AuthUser, id: string, input: any) {
  const before = await getCategoryById(id);
  const category = await prisma.serviceCategory.update({ where: { id }, data: input });
  clearCategoryCache();
  await recordAudit({ actorId: actor.id, action: 'UPDATE', entityType: 'ServiceCategory', entityId: id, before, after: category });
  return category;
}

/** FR-SVC-04: disable, never delete, to preserve historical data integrity. */
export async function deactivateCategory(actor: AuthUser, id: string) {
  await getCategoryById(id);
  const category = await prisma.serviceCategory.update({ where: { id }, data: { isActive: false } });
  clearCategoryCache();
  await recordAudit({ actorId: actor.id, action: 'DEACTIVATE', entityType: 'ServiceCategory', entityId: id });
  return category;
}
