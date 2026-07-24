import { z } from 'zod';
import { ServiceRequestStatus } from '@prisma/client';

export const createServiceRequestSchema = z.object({
  body: z.object({
    customerId: z.string().uuid(),
    serviceCategoryId: z.string().uuid(),
    description: z.string().min(5),
    siteAddressId: z.string().uuid().optional(),
    preferredContactTime: z.coerce.date().optional(),
    ownerId: z.string().uuid().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const createOwnServiceRequestSchema = z.object({
  body: z.object({
    serviceCategoryId: z.string().uuid(),
    description: z.string().min(5),
    siteAddressId: z.string().uuid().optional(),
    preferredContactTime: z.coerce.date().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateServiceRequestSchema = z.object({
  body: z.object({
    status: z.nativeEnum(ServiceRequestStatus).optional(),
    ownerId: z.string().uuid().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const listServiceRequestsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    status: z.nativeEnum(ServiceRequestStatus).optional(),
    ownerId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  params: z.object({}).optional(),
});
