import { Prisma, ServiceCategoryGroup, ServiceStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/utils/http-error';
import { recordAudit } from '@/utils/audit';
import { AuthUser } from '@/middleware/auth';
import { ACTIVE_PROJECT_STATUSES } from '@/config/project-status-groups';

interface ServiceInput {
  serviceName: string;
  category: ServiceCategoryGroup;
  description?: string;
  durationMinutes?: number | null;
  estimatedCost?: number | null;
  requiredMaterials?: string[];
  features?: string[];
  imageUrl?: string | null;
  displayOrder?: number;
  notes?: string | null;
  status?: ServiceStatus;
}

export async function createService(actor: AuthUser | undefined, input: ServiceInput) {
  const existing = await prisma.service.findUnique({
    where: { serviceName_category: { serviceName: input.serviceName, category: input.category } },
  });
  if (existing) {
    throw HttpError.conflict('A service with this name already exists in this category', { existingServiceId: existing.id });
  }

  const service = await prisma.service.create({
    data: {
      serviceName: input.serviceName,
      category: input.category,
      description: input.description,
      durationMinutes: input.durationMinutes,
      estimatedCost: input.estimatedCost,
      requiredMaterials: input.requiredMaterials ?? [],
      features: input.features ?? [],
      imageUrl: input.imageUrl,
      displayOrder: input.displayOrder,
      notes: input.notes,
      status: input.status,
      createdById: actor?.id,
    },
  });
  await recordAudit({ actorId: actor?.id, action: 'CREATE', entityType: 'Service', entityId: service.id, after: service });
  return service;
}

interface ListServicesFilters {
  search?: string;
  category?: ServiceCategoryGroup;
  status?: ServiceStatus;
  sort: 'newest' | 'oldest' | 'alphabetical' | 'cost_high' | 'cost_low' | 'display_order';
  page: number;
  pageSize: number;
}

export async function listServices(filters: ListServicesFilters) {
  const where: Prisma.ServiceWhereInput = {
    ...(filters.category ? { category: filters.category } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.search
      ? {
          OR: [
            { serviceName: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ServiceOrderByWithRelationInput =
    filters.sort === 'oldest'
      ? { createdAt: 'asc' }
      : filters.sort === 'alphabetical'
        ? { serviceName: 'asc' }
        : filters.sort === 'cost_high'
          ? { estimatedCost: 'desc' }
          : filters.sort === 'cost_low'
            ? { estimatedCost: 'asc' }
            : filters.sort === 'display_order'
              ? { displayOrder: 'asc' }
              : { createdAt: 'desc' };

  const [items, total] = await Promise.all([
    prisma.service.findMany({
      where,
      orderBy,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.service.count({ where }),
  ]);

  return { items, total, page: filters.page, pageSize: filters.pageSize };
}

export async function getServiceById(id: string) {
  const service = await prisma.service.findUnique({ where: { id } });
  if (!service) throw HttpError.notFound('Service not found');
  return service;
}

export async function updateService(actor: AuthUser | undefined, id: string, input: Partial<ServiceInput>) {
  const before = await getServiceById(id);

  if (input.serviceName || input.category) {
    const serviceName = input.serviceName ?? before.serviceName;
    const category = input.category ?? before.category;
    const existing = await prisma.service.findUnique({ where: { serviceName_category: { serviceName, category } } });
    if (existing && existing.id !== id) {
      throw HttpError.conflict('A service with this name already exists in this category', { existingServiceId: existing.id });
    }
  }

  const service = await prisma.service.update({ where: { id }, data: input as Prisma.ServiceUpdateInput });
  await recordAudit({ actorId: actor?.id, action: 'UPDATE', entityType: 'Service', entityId: id, before, after: service });
  return service;
}

/** FR-SVC-04-style rule: a Service linked to a Quotation whose Project is still active cannot be deleted. */
async function assertNotLinkedToActiveProject(id: string) {
  const activeLinkCount = await prisma.quotationLineItem.count({
    where: { serviceId: id, quotation: { project: { status: { in: ACTIVE_PROJECT_STATUSES } } } },
  });
  if (activeLinkCount > 0) {
    throw HttpError.conflict('This service is linked to one or more active projects and cannot be deleted. Set it to Inactive instead.');
  }
}

export async function deleteService(actor: AuthUser, id: string) {
  const service = await getServiceById(id);
  await assertNotLinkedToActiveProject(id);
  await prisma.service.delete({ where: { id } });
  await recordAudit({ actorId: actor.id, action: 'DELETE', entityType: 'Service', entityId: id, before: service });
}

export async function setServiceStatus(actor: AuthUser, id: string, status: ServiceStatus) {
  const before = await getServiceById(id);
  const service = await prisma.service.update({ where: { id }, data: { status } });
  await recordAudit({ actorId: actor.id, action: 'SET_STATUS', entityType: 'Service', entityId: id, before, after: service });
  return service;
}

export async function getServiceStatistics() {
  const [byStatusRaw, byCategory, recentlyAdded, usageCounts] = await Promise.all([
    // One groupBy for total/active/inactive instead of three separate COUNTs.
    prisma.service.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.service.groupBy({ by: ['category'], _count: { _all: true } }),
    prisma.service.findMany({ orderBy: { createdAt: 'desc' }, take: 5 }),
    prisma.quotationLineItem.groupBy({
      by: ['serviceId'],
      where: { serviceId: { not: null } },
      _count: { serviceId: true },
      orderBy: { _count: { serviceId: 'desc' } },
      take: 5,
    }),
  ]);
  const byStatus = Object.fromEntries(byStatusRaw.map((row) => [row.status, row._count._all]));
  const total = byStatusRaw.reduce((sum, row) => sum + row._count._all, 0);
  const active = byStatus[ServiceStatus.ACTIVE] ?? 0;
  const inactive = byStatus[ServiceStatus.INACTIVE] ?? 0;

  const usedServiceIds = usageCounts.map((row) => row.serviceId).filter((id): id is string => id !== null);
  const usedServices = usedServiceIds.length
    ? await prisma.service.findMany({ where: { id: { in: usedServiceIds } } })
    : [];
  const serviceById = new Map(usedServices.map((s) => [s.id, s]));
  const mostFrequentlyUsed = usageCounts
    .map((row) => {
      const service = row.serviceId ? serviceById.get(row.serviceId) : undefined;
      return service ? { ...service, usageCount: row._count.serviceId } : null;
    })
    .filter((row): row is NonNullable<typeof row> => row !== null);

  return {
    totalServices: total,
    activeServices: active,
    inactiveServices: inactive,
    byCategory: byCategory.map((row) => ({ category: row.category, count: row._count._all })),
    recentlyAdded,
    mostFrequentlyUsed,
  };
}
