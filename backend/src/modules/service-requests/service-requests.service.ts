import { InspectionStatus, NotificationType, Prisma, Role, ServiceRequestPriority, ServiceRequestStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/utils/http-error';
import { recordAudit } from '@/utils/audit';
import { notify } from '@/utils/notify';
import { generateReferenceNumber } from '@/utils/numbering';
import { AuthUser } from '@/middleware/auth';
import { createSignedUploadUrl } from '@/lib/storage';

async function notifyAdmins(title: string, body: string, entityId: string) {
  const admins = await prisma.user.findMany({ where: { role: { in: [Role.SUPER_ADMIN, Role.ADMIN] } } });
  await Promise.all(
    admins.map((admin) =>
      notify({ userId: admin.id, type: NotificationType.SERVICE_REQUEST_ASSIGNED, title, body, entityType: 'ServiceRequest', entityId }),
    ),
  );
}

interface CreateServiceRequestInput {
  customerId: string;
  serviceCategoryId: string;
  serviceId?: string;
  title?: string;
  description: string;
  projectLocation?: string;
  projectType?: string;
  expectedStartDate?: Date;
  expectedCompletionDate?: Date;
  siteAddressId?: string;
  preferredContactTime?: Date;
  preferredDate?: Date;
  priority?: ServiceRequestPriority;
  ownerId?: string;
}

export async function createServiceRequest(actor: AuthUser | undefined, input: CreateServiceRequestInput) {
  const referenceNo = await generateReferenceNumber('SR', 'serviceRequest');

  const request = await prisma.serviceRequest.create({
    data: {
      referenceNo,
      customerId: input.customerId,
      serviceCategoryId: input.serviceCategoryId,
      serviceId: input.serviceId,
      title: input.title,
      description: input.description,
      projectLocation: input.projectLocation,
      projectType: input.projectType,
      expectedStartDate: input.expectedStartDate,
      expectedCompletionDate: input.expectedCompletionDate,
      siteAddressId: input.siteAddressId,
      preferredContactTime: input.preferredContactTime,
      preferredDate: input.preferredDate,
      priority: input.priority,
      ownerId: input.ownerId,
      createdById: actor?.id,
    },
    include: { customer: true, serviceCategory: true },
  });

  // FR-SR-06: notify the assigned owner, or all Admins if unassigned, within the request cycle.
  if (request.ownerId) {
    await notify({
      userId: request.ownerId,
      type: NotificationType.SERVICE_REQUEST_ASSIGNED,
      title: 'New Service Request assigned',
      body: `${request.referenceNo} — ${request.customer.fullName}`,
      entityType: 'ServiceRequest',
      entityId: request.id,
    });
  } else {
    await notifyAdmins('New Service Request received', `${request.referenceNo} — ${request.customer.fullName}`, request.id);
  }

  await recordAudit({ actorId: actor?.id, action: 'CREATE', entityType: 'ServiceRequest', entityId: request.id, after: request });
  return request;
}

interface ListServiceRequestsFilters {
  status?: ServiceRequestStatus;
  priority?: ServiceRequestPriority;
  serviceCategoryId?: string;
  serviceId?: string;
  ownerId?: string;
  customerId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  sort?: 'newest' | 'oldest' | 'preferred_date' | 'priority';
  page: number;
  pageSize: number;
}

const PRIORITY_SORT_ORDER = [
  ServiceRequestPriority.URGENT,
  ServiceRequestPriority.HIGH,
  ServiceRequestPriority.MEDIUM,
  ServiceRequestPriority.LOW,
];

export async function listServiceRequests(filters: ListServiceRequestsFilters) {
  const where: Prisma.ServiceRequestWhereInput = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.priority ? { priority: filters.priority } : {}),
    ...(filters.serviceCategoryId ? { serviceCategoryId: filters.serviceCategoryId } : {}),
    ...(filters.serviceId ? { serviceId: filters.serviceId } : {}),
    ...(filters.ownerId ? { ownerId: filters.ownerId } : {}),
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
    ...(filters.dateFrom || filters.dateTo
      ? { createdAt: { ...(filters.dateFrom ? { gte: filters.dateFrom } : {}), ...(filters.dateTo ? { lte: filters.dateTo } : {}) } }
      : {}),
    ...(filters.search
      ? {
          OR: [
            { referenceNo: { contains: filters.search, mode: 'insensitive' } },
            { title: { contains: filters.search, mode: 'insensitive' } },
            { description: { contains: filters.search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.ServiceRequestOrderByWithRelationInput =
    filters.sort === 'oldest'
      ? { createdAt: 'asc' }
      : filters.sort === 'preferred_date'
        ? { preferredDate: 'asc' }
        : { createdAt: 'desc' };

  // The list page (service-requests/page.tsx) only reads referenceNo, customer.fullName,
  // service.serviceName, serviceCategory.name, priority, status, and preferredDate — it never
  // touches `inspection`, so the previous `include: { inspection: true }` was pulling a full
  // SiteInspection row (30+ columns) per service request for data the list never renders.
  const [items, total] = await Promise.all([
    prisma.serviceRequest.findMany({
      where,
      select: {
        id: true,
        referenceNo: true,
        title: true,
        priority: true,
        status: true,
        preferredDate: true,
        createdAt: true,
        customer: { select: { id: true, fullName: true } },
        serviceCategory: { select: { id: true, name: true } },
        service: { select: { id: true, serviceName: true } },
      },
      orderBy,
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.serviceRequest.count({ where }),
  ]);

  // `priority` sort isn't a plain column ordering (URGENT > HIGH > MEDIUM > LOW), so
  // apply it in-memory after pagination — the filtered/paginated slice is small.
  if (filters.sort === 'priority') {
    items.sort((a, b) => PRIORITY_SORT_ORDER.indexOf(a.priority) - PRIORITY_SORT_ORDER.indexOf(b.priority));
  }

  return { items, total, page: filters.page, pageSize: filters.pageSize };
}

export async function getServiceRequestById(id: string) {
  const request = await prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      customer: true,
      serviceCategory: true,
      service: true,
      siteAddress: true,
      attachments: true,
      inspection: { include: { checklistItems: true, measurements: true, photos: true, inspector: { select: { id: true, fullName: true } } } },
      quotations: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!request) throw HttpError.notFound('Service request not found');
  return request;
}

interface UpdateServiceRequestInput {
  serviceCategoryId?: string;
  serviceId?: string | null;
  title?: string | null;
  description?: string;
  projectLocation?: string | null;
  projectType?: string | null;
  expectedStartDate?: Date | null;
  expectedCompletionDate?: Date | null;
  siteAddressId?: string | null;
  preferredContactTime?: Date | null;
  preferredDate?: Date | null;
  priority?: ServiceRequestPriority;
  ownerId?: string | null;
}

/** General edits (not status — see updateServiceRequestStatus). */
export async function updateServiceRequest(actor: AuthUser, id: string, input: UpdateServiceRequestInput) {
  const before = await getServiceRequestById(id);
  const request = await prisma.serviceRequest.update({ where: { id }, data: input });

  if (input.ownerId && input.ownerId !== before.ownerId) {
    await notify({
      userId: input.ownerId,
      type: NotificationType.SERVICE_REQUEST_ASSIGNED,
      title: 'Service Request assigned to you',
      body: `${request.referenceNo}`,
      entityType: 'ServiceRequest',
      entityId: id,
    });
  }

  await recordAudit({ actorId: actor.id, action: 'UPDATE', entityType: 'ServiceRequest', entityId: id, before, after: request });
  return request;
}

/** FR-SR-05: staff moves a request through its workflow; the submitting customer is notified. */
export async function updateServiceRequestStatus(actor: AuthUser, id: string, status: ServiceRequestStatus) {
  const before = await getServiceRequestById(id);
  const request = await prisma.serviceRequest.update({ where: { id }, data: { status } });

  if (before.customer.userId) {
    await notify({
      userId: before.customer.userId,
      type: NotificationType.SERVICE_REQUEST_ASSIGNED,
      title: 'Your Service Request status changed',
      body: `${request.referenceNo} is now ${status.replaceAll('_', ' ')}`,
      entityType: 'ServiceRequest',
      entityId: id,
    });
  }

  await recordAudit({ actorId: actor.id, action: 'SET_STATUS', entityType: 'ServiceRequest', entityId: id, before, after: request });
  return request;
}

export async function deleteServiceRequest(actor: AuthUser, id: string) {
  const request = await getServiceRequestById(id);
  const quotationCount = await prisma.quotation.count({ where: { serviceRequestId: id } });
  if (quotationCount > 0) {
    throw HttpError.conflict('This request already has a Quotation and cannot be deleted. Cancel or close it instead.');
  }
  await prisma.serviceRequest.delete({ where: { id } });
  await recordAudit({ actorId: actor.id, action: 'DELETE', entityType: 'ServiceRequest', entityId: id, before: request });
}

// ── Attachments ─────────────────────────────────────────────────────────────

export async function requestAttachmentUploadUrl(id: string, fileName: string) {
  await getServiceRequestById(id);
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const path = `service-requests/${id}/${Date.now()}-${safeName}`;
  return createSignedUploadUrl(path);
}

export async function addAttachment(actor: AuthUser | undefined, id: string, input: { fileName: string; fileUrl: string }) {
  await getServiceRequestById(id);
  const attachment = await prisma.serviceRequestAttachment.create({
    data: { serviceRequestId: id, fileName: input.fileName, fileUrl: input.fileUrl, uploadedById: actor?.id },
  });
  await recordAudit({ actorId: actor?.id, action: 'CREATE', entityType: 'ServiceRequestAttachment', entityId: attachment.id });
  return attachment;
}

// ── Statistics (Section 5 — Dashboard Integration) ───────────────────────────

const PENDING_STATUSES: ServiceRequestStatus[] = [
  ServiceRequestStatus.NEW,
  ServiceRequestStatus.UNDER_REVIEW,
  ServiceRequestStatus.SITE_INSPECTION_SCHEDULED,
  ServiceRequestStatus.INSPECTION_COMPLETED,
];

export async function getServiceRequestStatistics() {
  // total/pending are derived from byStatus, and both inspection counts come from one
  // groupBy — four separate COUNT round trips collapsed into the two groupBys already
  // needed for the byStatus/byPriority breakdowns.
  const [byStatus, byPriority, inspectionsByStatus, avgCostAgg, monthlyTrendRaw] = await Promise.all([
    prisma.serviceRequest.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.serviceRequest.groupBy({ by: ['priority'], _count: { _all: true } }),
    prisma.siteInspection.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.siteInspection.aggregate({ _avg: { estimatedCost: true }, where: { estimatedCost: { not: null } } }),
    prisma.$queryRaw<{ month: string; count: bigint }[]>`
      SELECT to_char("createdAt", 'YYYY-MM') AS month, COUNT(*)::bigint AS count
      FROM "ServiceRequest"
      WHERE "createdAt" >= NOW() - INTERVAL '6 months'
      GROUP BY month
      ORDER BY month ASC
    `,
  ]);

  const total = byStatus.reduce((sum, row) => sum + row._count._all, 0);
  const pending = byStatus.filter((row) => PENDING_STATUSES.includes(row.status)).reduce((sum, row) => sum + row._count._all, 0);
  const inspectionStatusCounts = Object.fromEntries(inspectionsByStatus.map((row) => [row.status, row._count._all]));
  const scheduledInspections = (inspectionStatusCounts[InspectionStatus.SCHEDULED] ?? 0) + (inspectionStatusCounts[InspectionStatus.IN_PROGRESS] ?? 0);
  const completedInspections = inspectionStatusCounts[InspectionStatus.COMPLETED] ?? 0;

  return {
    totalRequests: total,
    pendingRequests: pending,
    scheduledInspections,
    completedInspections,
    averageInspectionCost: avgCostAgg._avg.estimatedCost != null ? Number(avgCostAgg._avg.estimatedCost) : null,
    byStatus: byStatus.map((row) => ({ status: row.status, count: row._count._all })),
    byPriority: byPriority.map((row) => ({ priority: row.priority, count: row._count._all })),
    monthlyTrend: monthlyTrendRaw.map((row) => ({ month: row.month, count: Number(row.count) })),
  };
}
