import { InspectionStatus, NotificationType, Prisma, ServiceRequestStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/utils/http-error';
import { recordAudit } from '@/utils/audit';
import { notify } from '@/utils/notify';
import { AuthUser } from '@/middleware/auth';
import { createSignedUploadUrl } from '@/lib/storage';

type MaterialEstimateRow = { material: string; quantity: string; estimatedCost: number };
type LaborEstimateRow = { task: string; estimatedHours: number; cost: number };

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * Cost Summary auto-calculation: materialCost/laborCost roll up from the JSON estimate
 * arrays whenever they're (re)submitted, falling back to whatever was already stored so
 * an incremental save that only touches labor doesn't wipe out a previously-saved material
 * figure. estimatedCost is auto-derived from the three components unless the caller passes
 * an explicit override.
 */
function computeCostSummary(
  before: { materialCost: Prisma.Decimal | null; laborCost: Prisma.Decimal | null; transportationCost: Prisma.Decimal | null },
  input: { materialEstimate?: MaterialEstimateRow[]; laborEstimate?: LaborEstimateRow[]; transportationCost?: number; estimatedCost?: number },
) {
  const materialCost = input.materialEstimate
    ? round2(input.materialEstimate.reduce((sum, m) => sum + m.estimatedCost, 0))
    : before.materialCost != null
      ? Number(before.materialCost)
      : undefined;
  const laborCost = input.laborEstimate
    ? round2(input.laborEstimate.reduce((sum, l) => sum + l.cost, 0))
    : before.laborCost != null
      ? Number(before.laborCost)
      : undefined;
  const transportationCost = input.transportationCost ?? (before.transportationCost != null ? Number(before.transportationCost) : undefined);

  const estimatedCost =
    input.estimatedCost ??
    (materialCost != null || laborCost != null || transportationCost != null
      ? round2((materialCost ?? 0) + (laborCost ?? 0) + (transportationCost ?? 0))
      : undefined);

  return { materialCost, laborCost, transportationCost, estimatedCost };
}

export async function scheduleInspection(
  actor: AuthUser,
  input: { serviceRequestId: string; inspectorId: string; scheduledAt: Date; siteAddress?: string; latitude?: number; longitude?: number },
) {
  const serviceRequest = await prisma.serviceRequest.findUnique({ where: { id: input.serviceRequestId } });
  if (!serviceRequest) throw HttpError.notFound('Service request not found');

  const inspection = await prisma.$transaction(async (tx) => {
    const created = await tx.siteInspection.create({
      data: {
        serviceRequestId: input.serviceRequestId,
        inspectorId: input.inspectorId,
        scheduledAt: input.scheduledAt,
        siteAddress: input.siteAddress,
        latitude: input.latitude,
        longitude: input.longitude,
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
    include: {
      serviceRequest: { include: { customer: true, serviceCategory: true, service: true } },
      checklistItems: true,
      measurements: true,
      photos: true,
      inspector: { select: { id: true, fullName: true } },
    },
  });
  if (!inspection) throw HttpError.notFound('Site inspection not found');
  return inspection;
}

export async function listInspections(filters: { inspectorId?: string; status?: InspectionStatus }) {
  return prisma.siteInspection.findMany({
    where: { ...(filters.inspectorId ? { inspectorId: filters.inspectorId } : {}), ...(filters.status ? { status: filters.status } : {}) },
    include: {
      serviceRequest: { include: { customer: true, serviceCategory: true, service: true } },
      inspector: { select: { id: true, fullName: true } },
    },
    orderBy: { scheduledAt: 'asc' },
  });
}

/**
 * GET /inspections/completed — the exact set a Quotation can be created from. Returns a
 * lean shape (customer/service names + estimates) purpose-built for the "select a
 * completed inspection" dropdown on the Quotation create page.
 */
export async function listCompletedInspections() {
  const inspections = await prisma.siteInspection.findMany({
    where: { status: InspectionStatus.COMPLETED },
    include: { serviceRequest: { include: { customer: true, serviceCategory: true, service: true } } },
    orderBy: { submittedAt: 'desc' },
  });

  return inspections.map((i) => ({
    id: i.id,
    serviceRequestId: i.serviceRequestId,
    customer: { id: i.serviceRequest.customer.id, name: i.serviceRequest.customer.fullName },
    service: { name: i.serviceRequest.service?.serviceName ?? i.serviceRequest.serviceCategory.name },
    inspectionDate: i.scheduledAt,
    completedAt: i.submittedAt,
    materialCost: i.materialCost != null ? Number(i.materialCost) : null,
    laborCost: i.laborCost != null ? Number(i.laborCost) : null,
    transportationCost: i.transportationCost != null ? Number(i.transportationCost) : null,
    estimatedCost: i.estimatedCost != null ? Number(i.estimatedCost) : null,
    estimatedDuration: i.estimatedDuration,
  }));
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

interface InspectionDetailsInput {
  accessNotes?: string;
  technicalNotes?: string;
  siteAddress?: string;
  latitude?: number;
  longitude?: number;
  measurements?: { label: string; length?: number; width?: number; height?: number; unit?: string; area?: number }[];
  materialEstimate?: MaterialEstimateRow[];
  laborEstimate?: LaborEstimateRow[];
  transportationCost?: number;
  estimatedCost?: number;
  estimatedDuration?: string;
}

/**
 * Incremental findings capture during the visit — measurements/notes/estimates can be saved
 * repeatedly while the inspector is on site. First save moves SCHEDULED -> IN_PROGRESS.
 * `measurements`, when provided, replaces the full set (not appended) so re-saving a form
 * doesn't accumulate duplicates.
 */
export async function updateInspectionDetails(actor: AuthUser, id: string, input: InspectionDetailsInput) {
  const before = await getInspectionById(id);
  if (before.status !== InspectionStatus.SCHEDULED && before.status !== InspectionStatus.IN_PROGRESS) {
    throw HttpError.badRequest('Only a Scheduled or In Progress inspection can be updated');
  }

  const { materialCost, laborCost, transportationCost, estimatedCost } = computeCostSummary(before, input);

  const inspection = await prisma.$transaction(async (tx) => {
    const updated = await tx.siteInspection.update({
      where: { id },
      data: {
        status: InspectionStatus.IN_PROGRESS,
        accessNotes: input.accessNotes,
        technicalNotes: input.technicalNotes,
        siteAddress: input.siteAddress,
        latitude: input.latitude,
        longitude: input.longitude,
        materialEstimate: input.materialEstimate as Prisma.InputJsonValue | undefined,
        laborEstimate: input.laborEstimate as Prisma.InputJsonValue | undefined,
        materialCost,
        laborCost,
        transportationCost,
        estimatedCost,
        estimatedDuration: input.estimatedDuration,
      },
    });

    if (input.measurements) {
      await tx.inspectionMeasurement.deleteMany({ where: { inspectionId: id } });
      if (input.measurements.length) {
        await tx.inspectionMeasurement.createMany({ data: input.measurements.map((m) => ({ inspectionId: id, ...m })) });
      }
    }

    return updated;
  });

  await recordAudit({ actorId: actor.id, action: 'UPDATE', entityType: 'SiteInspection', entityId: id, before, after: inspection });
  return getInspectionById(id);
}

// ── Photos ───────────────────────────────────────────────────────────────────

export async function requestPhotoUploadUrl(id: string, fileName: string) {
  await getInspectionById(id);
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `inspections/${id}/${Date.now()}-${safeName}`;
  return createSignedUploadUrl(path);
}

export async function addPhoto(actor: AuthUser, id: string, input: { fileUrl: string; caption?: string }) {
  await getInspectionById(id);
  const photo = await prisma.inspectionPhoto.create({ data: { inspectionId: id, fileUrl: input.fileUrl, caption: input.caption } });
  await recordAudit({ actorId: actor.id, action: 'CREATE', entityType: 'InspectionPhoto', entityId: photo.id });
  return photo;
}

/** FR-INSP-02..08: capture final findings/estimates and lock the record (read-only thereafter). */
export async function submitInspection(
  actor: AuthUser,
  id: string,
  input: {
    accessNotes?: string;
    technicalNotes?: string;
    siteAddress?: string;
    latitude?: number;
    longitude?: number;
    checklistItems?: { key: string; label: string; value?: unknown }[];
    measurements?: { label: string; length?: number; width?: number; height?: number; unit?: string; area?: number }[];
    materialEstimate?: MaterialEstimateRow[];
    laborEstimate?: LaborEstimateRow[];
    transportationCost?: number;
    estimatedCost?: number;
    estimatedDuration?: string;
    photos?: { fileUrl: string; caption?: string }[];
  },
) {
  const before = await getInspectionById(id);
  if (before.status !== InspectionStatus.SCHEDULED && before.status !== InspectionStatus.IN_PROGRESS) {
    throw HttpError.badRequest('Only a Scheduled or In Progress inspection can be completed');
  }

  const { materialCost, laborCost, transportationCost, estimatedCost } = computeCostSummary(before, input);

  const inspection = await prisma.$transaction(async (tx) => {
    const updated = await tx.siteInspection.update({
      where: { id },
      data: {
        status: InspectionStatus.COMPLETED,
        accessNotes: input.accessNotes,
        technicalNotes: input.technicalNotes,
        siteAddress: input.siteAddress,
        latitude: input.latitude,
        longitude: input.longitude,
        materialEstimate: input.materialEstimate as Prisma.InputJsonValue | undefined,
        laborEstimate: input.laborEstimate as Prisma.InputJsonValue | undefined,
        materialCost,
        laborCost,
        transportationCost,
        estimatedCost,
        estimatedDuration: input.estimatedDuration,
        submittedAt: new Date(),
      },
    });

    if (input.checklistItems?.length) {
      await tx.inspectionChecklistItem.createMany({
        data: input.checklistItems.map((item) => ({ inspectionId: id, key: item.key, label: item.label, value: item.value as any })),
      });
    }
    if (input.measurements?.length) {
      await tx.inspectionMeasurement.deleteMany({ where: { inspectionId: id } });
      await tx.inspectionMeasurement.createMany({ data: input.measurements.map((m) => ({ inspectionId: id, ...m })) });
    }
    if (input.photos?.length) {
      await tx.inspectionPhoto.createMany({ data: input.photos.map((p) => ({ inspectionId: id, ...p })) });
    }

    await tx.serviceRequest.update({
      where: { id: before.serviceRequestId },
      data: { status: ServiceRequestStatus.INSPECTION_COMPLETED },
    });

    return updated;
  });

  // FR-INSP-06: notify the Service Request owner (or fall back to Admins) that the inspection is ready for quotation.
  const serviceRequest = await prisma.serviceRequest.findUnique({ where: { id: before.serviceRequestId } });
  if (serviceRequest?.ownerId) {
    await notify({
      userId: serviceRequest.ownerId,
      type: NotificationType.INSPECTION_COMPLETED,
      title: 'Site Inspection completed — ready for quotation',
      body: `${serviceRequest.referenceNo}`,
      entityType: 'SiteInspection',
      entityId: id,
    });
  }

  await recordAudit({ actorId: actor.id, action: 'SUBMIT', entityType: 'SiteInspection', entityId: id, before, after: inspection });
  return getInspectionById(id);
}
