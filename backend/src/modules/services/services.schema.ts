import { z } from 'zod';
import { ServiceCategoryGroup, ServiceStatus } from '@prisma/client';

export const createServiceSchema = z.object({
  body: z.object({
    serviceName: z.string().min(2),
    category: z.nativeEnum(ServiceCategoryGroup),
    description: z.string().optional(),
    durationMinutes: z.coerce.number().int().positive().optional(),
    estimatedCost: z.coerce.number().min(0).optional(),
    requiredMaterials: z.array(z.string().min(1)).optional(),
    status: z.nativeEnum(ServiceStatus).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateServiceSchema = z.object({
  body: z.object({
    serviceName: z.string().min(2).optional(),
    category: z.nativeEnum(ServiceCategoryGroup).optional(),
    description: z.string().optional(),
    durationMinutes: z.coerce.number().int().positive().nullable().optional(),
    estimatedCost: z.coerce.number().min(0).nullable().optional(),
    requiredMaterials: z.array(z.string().min(1)).optional(),
    status: z.nativeEnum(ServiceStatus).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

const sortOptions = ['newest', 'oldest', 'alphabetical', 'cost_high', 'cost_low'] as const;

export const listServicesSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    search: z.string().optional(),
    category: z.nativeEnum(ServiceCategoryGroup).optional(),
    status: z.nativeEnum(ServiceStatus).optional(),
    sort: z.enum(sortOptions).default('newest'),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  params: z.object({}).optional(),
});

export const serviceIdParamsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});
