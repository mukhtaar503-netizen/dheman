import { prisma } from '@/lib/prisma';
import { HttpError } from '@/utils/http-error';
import { recordAudit } from '@/utils/audit';
import { AuthUser } from '@/middleware/auth';

export async function createCategory(actor: AuthUser, input: any) {
  const existing = await prisma.serviceCategory.findUnique({ where: { code: input.code } });
  if (existing) throw HttpError.conflict('A service category with this code already exists');

  const category = await prisma.serviceCategory.create({ data: input });
  await recordAudit({ actorId: actor.id, action: 'CREATE', entityType: 'ServiceCategory', entityId: category.id, after: category });
  return category;
}

export async function listCategories(includeInactive = false) {
  return prisma.serviceCategory.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { name: 'asc' },
  });
}

export async function getCategoryById(id: string) {
  const category = await prisma.serviceCategory.findUnique({ where: { id } });
  if (!category) throw HttpError.notFound('Service category not found');
  return category;
}

export async function updateCategory(actor: AuthUser, id: string, input: any) {
  const before = await getCategoryById(id);
  const category = await prisma.serviceCategory.update({ where: { id }, data: input });
  await recordAudit({ actorId: actor.id, action: 'UPDATE', entityType: 'ServiceCategory', entityId: id, before, after: category });
  return category;
}

/** FR-SVC-04: disable, never delete, to preserve historical data integrity. */
export async function deactivateCategory(actor: AuthUser, id: string) {
  await getCategoryById(id);
  const category = await prisma.serviceCategory.update({ where: { id }, data: { isActive: false } });
  await recordAudit({ actorId: actor.id, action: 'DEACTIVATE', entityType: 'ServiceCategory', entityId: id });
  return category;
}
