import { AttachmentType, InspectionStatus, NotificationType, Prisma, ServiceRequestStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/utils/http-error';
import { recordAudit } from '@/utils/audit';
import { notify } from '@/utils/notify';
import { generateReferenceNumber } from '@/utils/numbering';
import { AuthUser } from '@/middleware/auth';
import { createSignedUploadUrl } from '@/lib/storage';
import { generateInspectionPdf } from './inspections.pdf.service';

type MaterialEstimateRow = { material: string; quantity: string; unit?: string; estimatedCost?: number; remarks?: string };
type LaborEstimateRow = { task: string; estimatedHours: number; cost: number };

/** Fields from the Site Inspection Registration form, shared by create and full update. */
interface RegistrationFields {
  siteAddress?: string;
  landmark?: string;
  city?: string;
  region?: string;
  latitude?: number;
  longitude?: number;
  inspectionPurpose?: string;
  customerRequirements?: string;
  existingSiteCondition?: string;
  internalNotes?: string;
  estimatedWorkers?: number;
  estimatedWorkingDays?: number;
  specialSkillsRequired?: string;
  vehicleRequired?: string;
  transportDistance?: number;
  accessibility?: string;
  transportationNotes?: string;
  technicalNotes?: string;
}

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
    ? round2(input.materialEstimate.reduce((sum, m) => sum + (m.estimatedCost ?? 0), 0))
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

/**
 * Register a new Site Inspection. `status` controls the Save Draft / Submit Inspection
 * split from the registration form: PENDING leaves it as an editable draft (the linked
 * Service Request isn't advanced yet); SCHEDULED (the default) confirms it immediately,
 * same as the original "Schedule Site Inspection" flow.
 */
export async function scheduleInspection(
  actor: AuthUser,
  input: RegistrationFields & {
    serviceRequestId: string;
    inspectorId: string;
    scheduledAt: Date;
    status?: typeof InspectionStatus.PENDING | typeof InspectionStatus.SCHEDULED;
    measurements?: MeasurementRow[];
    materialEstimate?: MaterialEstimateRow[];
  },
) {
  const serviceRequest = await prisma.serviceRequest.findUnique({ where: { id: input.serviceRequestId } });
  if (!serviceRequest) throw HttpError.notFound('Service request not found');

  const inspectionNo = await generateReferenceNumber('INS', 'siteInspection');
  const status = input.status ?? InspectionStatus.SCHEDULED;
  // Only the Registration form's "Submit Inspection" path explicitly declares `status`, so
  // this guard doesn't touch the older "Schedule Site Inspection" callers (Service Requests
  // module, etc.) that never sent it and never required a site address up front.
  if (input.status === InspectionStatus.SCHEDULED && !input.siteAddress) {
    throw HttpError.badRequest('Site address is required to submit this inspection (save as a draft to skip it for now)');
  }

  const inspection = await prisma.$transaction(async (tx) => {
    const created = await tx.siteInspection.create({
      data: {
        inspectionNo,
        serviceRequestId: input.serviceRequestId,
        inspectorId: input.inspectorId,
        scheduledAt: input.scheduledAt,
        status,
        siteAddress: input.siteAddress,
        landmark: input.landmark,
        city: input.city,
        region: input.region,
        latitude: input.latitude,
        longitude: input.longitude,
        inspectionPurpose: input.inspectionPurpose,
        customerRequirements: input.customerRequirements,
        existingSiteCondition: input.existingSiteCondition,
        internalNotes: input.internalNotes,
        estimatedWorkers: input.estimatedWorkers,
        estimatedWorkingDays: input.estimatedWorkingDays,
        specialSkillsRequired: input.specialSkillsRequired,
        vehicleRequired: input.vehicleRequired,
        transportDistance: input.transportDistance,
        accessibility: input.accessibility,
        transportationNotes: input.transportationNotes,
        materialEstimate: input.materialEstimate as Prisma.InputJsonValue | undefined,
      },
    });
    if (input.measurements?.length) {
      await tx.inspectionMeasurement.createMany({ data: input.measurements.map((m) => ({ inspectionId: created.id, ...m })) });
    }
    if (status === InspectionStatus.SCHEDULED) {
      await tx.serviceRequest.update({
        where: { id: input.serviceRequestId },
        data: { status: ServiceRequestStatus.SITE_INSPECTION_SCHEDULED },
      });
    }
    return created;
  });

  // FR-SCHED-03: notify the assigned Site Inspector ahead of the visit — but not for a
  // draft that hasn't been submitted yet, since nothing is confirmed for them to act on.
  if (status === InspectionStatus.SCHEDULED) {
    await notify({
      userId: input.inspectorId,
      type: NotificationType.INSPECTION_SCHEDULED,
      title: 'Site Inspection scheduled',
      body: `Inspection for ${serviceRequest.referenceNo} scheduled at ${input.scheduledAt.toISOString()}`,
      entityType: 'SiteInspection',
      entityId: inspection.id,
    });
  }

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

interface ListInspectionsFilters {
  inspectorId?: string;
  status?: InspectionStatus;
  customerId?: string;
  serviceRequestId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  page?: number;
  pageSize?: number;
}

export async function listInspections(filters: ListInspectionsFilters) {
  const where: Prisma.SiteInspectionWhereInput = {
    ...(filters.inspectorId ? { inspectorId: filters.inspectorId } : {}),
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.serviceRequestId ? { serviceRequestId: filters.serviceRequestId } : {}),
    ...(filters.customerId ? { serviceRequest: { customerId: filters.customerId } } : {}),
    ...(filters.dateFrom || filters.dateTo
      ? { scheduledAt: { ...(filters.dateFrom ? { gte: filters.dateFrom } : {}), ...(filters.dateTo ? { lte: filters.dateTo } : {}) } }
      : {}),
    ...(filters.search
      ? {
          OR: [
            { inspectionNo: { contains: filters.search, mode: 'insensitive' } },
            { serviceRequest: { referenceNo: { contains: filters.search, mode: 'insensitive' } } },
            { serviceRequest: { title: { contains: filters.search, mode: 'insensitive' } } },
            { serviceRequest: { customer: { fullName: { contains: filters.search, mode: 'insensitive' } } } },
          ],
        }
      : {}),
  };

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;

  const [items, total] = await Promise.all([
    prisma.siteInspection.findMany({
      where,
      include: {
        serviceRequest: { include: { customer: true, serviceCategory: true, service: true } },
        inspector: { select: { id: true, fullName: true } },
      },
      orderBy: { scheduledAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.siteInspection.count({ where }),
  ]);

  return { items, total, page, pageSize };
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
    take: 200, // dropdown picker — bounded defensively, most-recently-completed first
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

/**
 * "Update Inspection" — general registration edits (reschedule, reassign, revise site/
 * assessment details, cancel, or submit a draft). Allowed any time before the inspector
 * has started on-site work; once IN_PROGRESS/COMPLETED, use /details or /complete instead.
 * Passing `status: SCHEDULED` on a PENDING draft is how "Submit Inspection" is implemented —
 * it re-validates the fields the registration form requires before letting the draft advance.
 */
export async function reschedule(
  actor: AuthUser,
  id: string,
  input: RegistrationFields & {
    scheduledAt?: Date;
    inspectorId?: string;
    cancelReason?: string;
    status?: typeof InspectionStatus.PENDING | typeof InspectionStatus.SCHEDULED;
    measurements?: MeasurementRow[];
    materialEstimate?: MaterialEstimateRow[];
  },
) {
  const before = await getInspectionById(id);
  if (before.status !== InspectionStatus.PENDING && before.status !== InspectionStatus.SCHEDULED) {
    throw HttpError.badRequest('Only a Pending or Scheduled inspection can be updated, rescheduled, or cancelled');
  }

  const data: Prisma.SiteInspectionUpdateInput = {};
  if (input.scheduledAt) data.scheduledAt = input.scheduledAt;
  if (input.inspectorId) data.inspector = { connect: { id: input.inspectorId } };
  if (input.siteAddress !== undefined) data.siteAddress = input.siteAddress;
  if (input.landmark !== undefined) data.landmark = input.landmark;
  if (input.city !== undefined) data.city = input.city;
  if (input.region !== undefined) data.region = input.region;
  if (input.latitude !== undefined) data.latitude = input.latitude;
  if (input.longitude !== undefined) data.longitude = input.longitude;
  if (input.inspectionPurpose !== undefined) data.inspectionPurpose = input.inspectionPurpose;
  if (input.customerRequirements !== undefined) data.customerRequirements = input.customerRequirements;
  if (input.existingSiteCondition !== undefined) data.existingSiteCondition = input.existingSiteCondition;
  if (input.internalNotes !== undefined) data.internalNotes = input.internalNotes;
  if (input.estimatedWorkers !== undefined) data.estimatedWorkers = input.estimatedWorkers;
  if (input.estimatedWorkingDays !== undefined) data.estimatedWorkingDays = input.estimatedWorkingDays;
  if (input.specialSkillsRequired !== undefined) data.specialSkillsRequired = input.specialSkillsRequired;
  if (input.vehicleRequired !== undefined) data.vehicleRequired = input.vehicleRequired;
  if (input.transportDistance !== undefined) data.transportDistance = input.transportDistance;
  if (input.accessibility !== undefined) data.accessibility = input.accessibility;
  if (input.transportationNotes !== undefined) data.transportationNotes = input.transportationNotes;
  if (input.materialEstimate !== undefined) data.materialEstimate = input.materialEstimate as Prisma.InputJsonValue;

  if (input.cancelReason) {
    data.status = InspectionStatus.CANCELLED;
    data.cancelReason = input.cancelReason;
  } else if (input.status === InspectionStatus.SCHEDULED && before.status === InspectionStatus.PENDING) {
    const inspectorId = input.inspectorId ?? before.inspectorId;
    const siteAddress = input.siteAddress ?? before.siteAddress;
    if (!inspectorId || !siteAddress) {
      throw HttpError.badRequest('Site address and an assigned inspector are required to submit this inspection');
    }
    data.status = InspectionStatus.SCHEDULED;
  }

  const inspection = await prisma.$transaction(async (tx) => {
    const updated = await tx.siteInspection.update({ where: { id }, data });
    if (input.measurements) {
      await tx.inspectionMeasurement.deleteMany({ where: { inspectionId: id } });
      if (input.measurements.length) {
        await tx.inspectionMeasurement.createMany({ data: input.measurements.map((m) => ({ inspectionId: id, ...m })) });
      }
    }
    if (data.status === InspectionStatus.SCHEDULED) {
      await tx.serviceRequest.update({
        where: { id: before.serviceRequestId },
        data: { status: ServiceRequestStatus.SITE_INSPECTION_SCHEDULED },
      });
    }
    return updated;
  });

  await recordAudit({ actorId: actor.id, action: 'UPDATE', entityType: 'SiteInspection', entityId: id, before, after: inspection });
  return inspection;
}

/**
 * Delete Inspection — blocked once a Quotation has been built from it (that link is the
 * real dependency to protect; the inspection's own children cascade at the DB level). The
 * linked Service Request is stepped back to UNDER_REVIEW so it isn't left showing a status
 * for a scheduled/completed inspection that no longer exists.
 */
export async function deleteInspection(actor: AuthUser, id: string) {
  const before = await getInspectionById(id);
  const quotationCount = await prisma.quotation.count({ where: { siteInspectionId: id } });
  if (quotationCount > 0) {
    throw HttpError.conflict('Cannot delete a Site Inspection that already has a Quotation built from it');
  }

  await prisma.$transaction(async (tx) => {
    await tx.siteInspection.delete({ where: { id } });
    await tx.serviceRequest.update({
      where: { id: before.serviceRequestId },
      data: { status: ServiceRequestStatus.UNDER_REVIEW },
    });
  });

  await recordAudit({ actorId: actor.id, action: 'DELETE', entityType: 'SiteInspection', entityId: id, before });
}

type MeasurementRow = { label: string; length?: number; width?: number; height?: number; unit?: string; quantity?: number; area?: number; notes?: string };

interface InspectionDetailsInput extends RegistrationFields {
  accessNotes?: string;
  measurements?: MeasurementRow[];
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
        internalNotes: input.internalNotes,
        siteAddress: input.siteAddress,
        landmark: input.landmark,
        city: input.city,
        region: input.region,
        latitude: input.latitude,
        longitude: input.longitude,
        inspectionPurpose: input.inspectionPurpose,
        customerRequirements: input.customerRequirements,
        existingSiteCondition: input.existingSiteCondition,
        estimatedWorkers: input.estimatedWorkers,
        estimatedWorkingDays: input.estimatedWorkingDays,
        specialSkillsRequired: input.specialSkillsRequired,
        vehicleRequired: input.vehicleRequired,
        transportDistance: input.transportDistance,
        accessibility: input.accessibility,
        transportationNotes: input.transportationNotes,
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

export async function addPhoto(actor: AuthUser, id: string, input: { fileUrl: string; caption?: string; fileType?: AttachmentType }) {
  await getInspectionById(id);
  const photo = await prisma.inspectionPhoto.create({
    data: { inspectionId: id, fileUrl: input.fileUrl, caption: input.caption, fileType: input.fileType ?? AttachmentType.PHOTO },
  });
  await recordAudit({ actorId: actor.id, action: 'CREATE', entityType: 'InspectionPhoto', entityId: photo.id });
  return photo;
}

/** FR-INSP-02..08: capture final findings/estimates and lock the record (read-only thereafter). */
export async function submitInspection(
  actor: AuthUser,
  id: string,
  input: RegistrationFields & {
    accessNotes?: string;
    checklistItems?: { key: string; label: string; value?: unknown }[];
    measurements?: MeasurementRow[];
    materialEstimate?: MaterialEstimateRow[];
    laborEstimate?: LaborEstimateRow[];
    transportationCost?: number;
    estimatedCost?: number;
    estimatedDuration?: string;
    photos?: { fileUrl: string; caption?: string; fileType?: AttachmentType }[];
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
        internalNotes: input.internalNotes,
        siteAddress: input.siteAddress,
        landmark: input.landmark,
        city: input.city,
        region: input.region,
        latitude: input.latitude,
        longitude: input.longitude,
        inspectionPurpose: input.inspectionPurpose,
        customerRequirements: input.customerRequirements,
        existingSiteCondition: input.existingSiteCondition,
        estimatedWorkers: input.estimatedWorkers,
        estimatedWorkingDays: input.estimatedWorkingDays,
        specialSkillsRequired: input.specialSkillsRequired,
        vehicleRequired: input.vehicleRequired,
        transportDistance: input.transportDistance,
        accessibility: input.accessibility,
        transportationNotes: input.transportationNotes,
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

// ── Print report ─────────────────────────────────────────────────────────────

export async function getInspectionPdfBuffer(id: string) {
  const inspection = await prisma.siteInspection.findUnique({
    where: { id },
    include: {
      serviceRequest: { include: { customer: true, serviceCategory: true, service: true } },
      inspector: { select: { id: true, fullName: true } },
      measurements: true,
    },
  });
  if (!inspection) throw HttpError.notFound('Site inspection not found');
  return { inspection, pdf: await generateInspectionPdf(inspection) };
}
