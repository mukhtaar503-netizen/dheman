import { prisma } from '@/lib/prisma';

export async function recordAudit(params: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId: string;
  before?: unknown;
  after?: unknown;
}) {
  await prisma.auditLog.create({
    data: {
      actorId: params.actorId ?? null,
      action: params.action,
      entityType: params.entityType,
      entityId: params.entityId,
      beforeJson: params.before ? JSON.parse(JSON.stringify(params.before)) : undefined,
      afterJson: params.after ? JSON.parse(JSON.stringify(params.after)) : undefined,
    },
  });
}
