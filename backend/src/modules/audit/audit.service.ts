import { prisma } from '@/lib/prisma';

export async function listAuditLogs(filters: { entityType?: string; actorId?: string; from?: Date; to?: Date; page: number; pageSize: number }) {
  const where = {
    ...(filters.entityType ? { entityType: filters.entityType } : {}),
    ...(filters.actorId ? { actorId: filters.actorId } : {}),
    ...(filters.from || filters.to
      ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { actor: { select: { id: true, fullName: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total, page: filters.page, pageSize: filters.pageSize };
}
