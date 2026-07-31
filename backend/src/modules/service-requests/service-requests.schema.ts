import { z } from 'zod';
import { ServiceRequestPriority, ServiceRequestStatus } from '@prisma/client';

export const createServiceRequestSchema = z.object({
  body: z.object({
    customerId: z.string().uuid(),
    serviceCategoryId: z.string().uuid(),
    serviceId: z.string().uuid().optional(),
    title: z.string().min(2).optional(),
    description: z.string().min(5),
    projectLocation: z.string().optional(),
    siteAddressId: z.string().uuid().optional(),
    preferredContactTime: z.coerce.date().optional(),
    preferredDate: z.coerce.date().optional(),
    priority: z.nativeEnum(ServiceRequestPriority).optional(),
    ownerId: z.string().uuid().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const createOwnServiceRequestSchema = z.object({
  body: z.object({
    serviceCategoryId: z.string().uuid(),
    serviceId: z.string().uuid().optional(),
    title: z.string().min(2).optional(),
    description: z.string().min(5),
    projectLocation: z.string().optional(),
    siteAddressId: z.string().uuid().optional(),
    preferredContactTime: z.coerce.date().optional(),
    preferredDate: z.coerce.date().optional(),
    priority: z.nativeEnum(ServiceRequestPriority).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

/** General edits — everything except `status`, which goes through the dedicated /status endpoint below. */
export const updateServiceRequestSchema = z.object({
  body: z.object({
    serviceCategoryId: z.string().uuid().optional(),
    serviceId: z.string().uuid().nullable().optional(),
    title: z.string().min(2).nullable().optional(),
    description: z.string().min(5).optional(),
    projectLocation: z.string().nullable().optional(),
    siteAddressId: z.string().uuid().nullable().optional(),
    preferredContactTime: z.coerce.date().nullable().optional(),
    preferredDate: z.coerce.date().nullable().optional(),
    priority: z.nativeEnum(ServiceRequestPriority).optional(),
    ownerId: z.string().uuid().nullable().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const updateServiceRequestStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(ServiceRequestStatus),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

const sortOptions = ['newest', 'oldest', 'preferred_date', 'priority'] as const;

export const listServiceRequestsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    status: z.nativeEnum(ServiceRequestStatus).optional(),
    priority: z.nativeEnum(ServiceRequestPriority).optional(),
    serviceCategoryId: z.string().uuid().optional(),
    serviceId: z.string().uuid().optional(),
    ownerId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    search: z.string().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    sort: z.enum(sortOptions).default('newest'),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  params: z.object({}).optional(),
});

export const serviceRequestIdParamsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const requestAttachmentUploadUrlSchema = z.object({
  body: z.object({
    fileName: z.string().min(1),
    mimeType: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const addServiceRequestAttachmentSchema = z.object({
  body: z.object({
    fileName: z.string().min(1),
    fileUrl: z.string().min(1),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});
