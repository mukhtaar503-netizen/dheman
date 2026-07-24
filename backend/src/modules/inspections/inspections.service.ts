import { InspectionStatus, NotificationType, ServiceRequestStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/utils/http-error';
import { recordAudit } from '@/utils/audit';
import { notify } from '@/utils/notify';
import { AuthUser } from '@/middleware/auth';

export async function scheduleInspection(actor: AuthUser, input: { serviceRequestId: string; inspectorId: string; scheduledAt: Date }) {
  const serviceRequest = await prisma.serviceRequest.findUnique({ where: { id: input.serviceRequestId } });
  if (!serviceRequest) throw HttpError.notFound('Service request not found');

  const inspection = await prisma.$transaction(async (tx) => {
    const created = await tx.siteInspection.create({
      data: {
        serviceRequestId: input.serviceRequestId,
        inspectorId: input.inspectorId,
        scheduledAt: input.scheduledAt,
      },
    });
    await tx.serviceRequest.update({
      where: { id: input.serviceRequestId },
      data: { status: ServiceRequestStatus.SITE_INSPECTION_SCHEDULED },
    });
    return created;
  });

  // FR-SCHED-03: notify the assigned Site Inspector ahead of the visit.
  await notify({
    userId: input.inspectorId,
    type: NotificationType.INSPECTION_SCHEDULED,
    title: 'Site Inspection scheduled',
    body: `Inspection for ${serviceRequest.referenceNo} scheduled at ${input.scheduledAt.toISOString()}`,
    entityType: 'SiteInspection',
    entityId: inspection.id,
  });

  await recordAudit({ actorId: actor.id, action: 'CREATE', entityType: 'SiteInspection', entityId: inspection.id, after: inspection });
  return inspection;
}

export async function getInspectionById(id: string) {
  const inspection = await prisma.siteInspection.findUnique({
    where: { id },
    include: { serviceRequest: { include: { customer: true, serviceCategory: true } }, checklistItems: true, measurements: true, photos: true, inspector: { select: { id: true, fullName: true } } },
  });
  if (!inspection) throw HttpError.notFound('Site inspection not found');
  return inspection;
}

export async function listInspections(filters: { inspectorId?: string; status?: InspectionStatus }) {
  return prisma.siteInspection.findMany({
    where: { ...(filters.inspectorId ? { inspectorId: filters.inspectorId } : {}), ...(filters.status ? { status: filters.status } : {}) },
    include: { serviceRequest: { include: { customer: true } } },
    orderBy: { scheduledAt: 'asc' },
  });
}

export async function reschedule(actor: AuthUser, id: string, input: { scheduledAt?: Date; inspectorId?: string; cancelReason?: string }) {
  const before = await getInspectionById(id);
  if (before.status !== InspectionStatus.SCHEDULED) {
    throw HttpError.badRequest('Only a Scheduled inspection can be rescheduled or cancelled');
  }

  const data: any = {};
  if (input.scheduledAt) data.scheduledAt = input.scheduledAt;
  if (input.inspectorId) data.inspectorId = input.inspectorId;
  if (input.cancelReason) {
    data.status = InspectionStatus.CANCELLED;
    data.cancelReason = input.cancelReason;
  }

  const inspection = await prisma.siteInspection.update({ where: { id }, data });
  await recordAudit({ actorId: actor.id, action: 'UPDATE', entityType: 'SiteInspection', entityId: id, before, after: inspection });
  return inspection;
}

/** FR-INSP-02..08: capture findings and lock the record (read-only thereafter). */
export async function submitInspection(
  actor: AuthUser,
  id: string,
  input: {
    accessNotes?: string;
    checklistItems?: { key: string; label: string; value?: unknown }[];
    measurements?: { label: string; length?: number; width?: number; height?: number; unit?: string; area?: number }[];
    photos?: { fileUrl: string; caption?: string }[];
  },
) {
  const before = await getInspectionById(id);
  if (before.status !== InspectionStatus.SCHEDULED) {
    throw HttpError.badRequest('Only a Scheduled inspection can be submitted');
  }

  const inspection = await prisma.$transaction(async (tx) => {
    const updated = await tx.siteInspection.update({
      where: { id },
      data: { status: InspectionStatus.COMPLETED, accessNotes: input.accessNotes, submittedAt: new Date() },
    });

    if (input.checklistItems?.length) {
      await tx.inspectionChecklistItem.createMany({
        data: input.checklistItems.map((item) => ({ inspectionId: id, key: item.key, label: item.label, value: item.value as any })),
      });
    }
    if (input.measurements?.length) {
      await tx.inspectionMeasurement.createMany({ data: input.measurements.map((m) => ({ inspectionId: id, ...m })) });
    }
    if (input.photos?.length) {
      await tx.inspectionPhoto.createMany({ data: input.photos.map((p) => ({ inspectionId: id, ...p })) });
    }

    await tx.serviceRequest.update({
      where: { id: before.serviceRequestId },
      data: { status: ServiceRequestStatus.UNDER_REVIEW },
    });

    return updated;
  });

  // FR-INSP-06: notify the Service Request owner (or fall back to Admins) that the inspection is ready for quotation.
  const serviceRequest = await prisma.serviceRequest.findUnique({ where: { id: before.serviceRequestId } });
  if (serviceRequest?.ownerId) {
    await notify({
      userId: serviceRequest.ownerId,
      type: NotificationType.INSPECTION_SCHEDULED,
      title: 'Site Inspection completed — ready for quotation',
      body: `${serviceRequest.referenceNo}`,
      entityType: 'SiteInspection',
      entityId: id,
    });
  }

  await recordAudit({ actorId: actor.id, action: 'SUBMIT', entityType: 'SiteInspection', entityId: id, before, after: inspection });
  return getInspectionById(id);
}
