import { MaterialEntryType } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/utils/http-error';
import { recordAudit } from '@/utils/audit';
import { notify } from '@/utils/notify';
import { AuthUser } from '@/middleware/auth';

const VARIANCE_ALERT_THRESHOLD_PERCENT = 20;

export async function createMaterialEntry(
  actor: AuthUser,
  input: { projectId: string; taskId?: string; type: MaterialEntryType; itemName: string; quantity: number; unit: string; receiptUrl?: string },
) {
  const project = await prisma.project.findUnique({ where: { id: input.projectId } });
  if (!project) throw HttpError.notFound('Project not found');

  const entry = await prisma.projectMaterial.create({ data: { ...input, recordedById: actor.id } });
  await recordAudit({ actorId: actor.id, action: 'CREATE', entityType: 'ProjectMaterial', entityId: entry.id, after: entry });

  if (input.type === MaterialEntryType.ACTUAL) {
    await checkVariance(input.projectId, input.itemName, project.projectManagerId);
  }

  return entry;
}

/** BR-MAT-02: alert the Project Manager when actual usage exceeds estimate by more than the threshold. */
async function checkVariance(projectId: string, itemName: string, projectManagerId: string | null) {
  const [estimated, actual] = await Promise.all([
    prisma.projectMaterial.aggregate({ where: { projectId, itemName, type: MaterialEntryType.ESTIMATED }, _sum: { quantity: true } }),
    prisma.projectMaterial.aggregate({ where: { projectId, itemName, type: MaterialEntryType.ACTUAL }, _sum: { quantity: true } }),
  ]);
  const estimatedQty = Number(estimated._sum.quantity ?? 0);
  const actualQty = Number(actual._sum.quantity ?? 0);
  if (estimatedQty <= 0) return;

  const variancePercent = ((actualQty - estimatedQty) / estimatedQty) * 100;
  if (variancePercent > VARIANCE_ALERT_THRESHOLD_PERCENT && projectManagerId) {
    await notify({
      userId: projectManagerId,
      type: 'GENERIC',
      title: 'Material variance alert',
      body: `${itemName}: actual usage is ${variancePercent.toFixed(1)}% over estimate on this project`,
      entityType: 'Project',
      entityId: projectId,
    });
  }
}

export async function getMaterialsForProject(projectId: string) {
  const entries = await prisma.projectMaterial.findMany({ where: { projectId }, orderBy: { createdAt: 'desc' } });

  const byItem = new Map<string, { itemName: string; unit: string; estimatedQty: number; actualQty: number }>();
  for (const entry of entries) {
    const key = entry.itemName;
    const bucket = byItem.get(key) ?? { itemName: entry.itemName, unit: entry.unit, estimatedQty: 0, actualQty: 0 };
    if (entry.type === MaterialEntryType.ESTIMATED) bucket.estimatedQty += Number(entry.quantity);
    else bucket.actualQty += Number(entry.quantity);
    byItem.set(key, bucket);
  }

  // FR-MAT-03: Estimated vs. Actual variance per item.
  const variance = Array.from(byItem.values()).map((v) => ({
    ...v,
    variance: v.actualQty - v.estimatedQty,
    variancePercent: v.estimatedQty > 0 ? Math.round(((v.actualQty - v.estimatedQty) / v.estimatedQty) * 10000) / 100 : null,
  }));

  return { entries, variance };
}
