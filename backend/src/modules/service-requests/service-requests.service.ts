import { NotificationType, Role, ServiceRequestStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { HttpError } from '@/utils/http-error';
import { recordAudit } from '@/utils/audit';
import { notify } from '@/utils/notify';
import { generateReferenceNumber } from '@/utils/numbering';
import { AuthUser } from '@/middleware/auth';

async function notifyAdmins(title: string, body: string, entityId: string) {
  const admins = await prisma.user.findMany({ where: { role: { in: [Role.SUPER_ADMIN, Role.ADMIN] } } });
  await Promise.all(
    admins.map((admin) =>
      notify({ userId: admin.id, type: NotificationType.SERVICE_REQUEST_ASSIGNED, title, body, entityType: 'ServiceRequest', entityId }),
    ),
  );
}

export async function createServiceRequest(
  actor: AuthUser | undefined,
  input: { customerId: string; serviceCategoryId: string; description: string; siteAddressId?: string; preferredContactTime?: Date; ownerId?: string },
) {
  const referenceNo = await generateReferenceNumber('SR', 'serviceRequest');

  const request = await prisma.serviceRequest.create({
    data: {
      referenceNo,
      customerId: input.customerId,
      serviceCategoryId: input.serviceCategoryId,
      description: input.description,
      siteAddressId: input.siteAddressId,
      preferredContactTime: input.preferredContactTime,
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

export async function listServiceRequests(filters: {
  status?: ServiceRequestStatus;
  ownerId?: string;
  customerId?: string;
  page: number;
  pageSize: number;
}) {
  const where = {
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.ownerId ? { ownerId: filters.ownerId } : {}),
    ...(filters.customerId ? { customerId: filters.customerId } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.serviceRequest.findMany({
      where,
      include: { customer: true, serviceCategory: true, inspection: true },
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.pageSize,
      take: filters.pageSize,
    }),
    prisma.serviceRequest.count({ where }),
  ]);

  return { items, total, page: filters.page, pageSize: filters.pageSize };
}

export async function getServiceRequestById(id: string) {
  const request = await prisma.serviceRequest.findUnique({
    where: { id },
    include: {
      customer: true,
      serviceCategory: true,
      siteAddress: true,
      attachments: true,
      inspection: { include: { checklistItems: true, measurements: true, photos: true } },
      quotations: { orderBy: { createdAt: 'desc' } },
    },
  });
  if (!request) throw HttpError.notFound('Service request not found');
  return request;
}

export async function updateServiceRequest(actor: AuthUser, id: string, input: { status?: ServiceRequestStatus; ownerId?: string }) {
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
