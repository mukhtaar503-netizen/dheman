import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

const rangeShape = {
  range: z.enum(['today', 'week', 'month', 'quarter', 'year', 'custom']).default('month'),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
};

export const rangeQuerySchema = z.object({
  body: z.object({}).optional(),
  query: z.object(rangeShape),
  params: z.object({}).optional(),
});

export const seriesQuerySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({ ...rangeShape, granularity: z.enum(['day', 'month']).default('day') }),
  params: z.object({}).optional(),
});

export const pagedQuerySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  params: z.object({}).optional(),
});

export const paymentsQuerySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    search: z.string().optional(),
    method: z.nativeEnum(PaymentMethod).optional(),
    from: z.coerce.date().optional(),
    to: z.coerce.date().optional(),
    sortBy: z.enum(['paidAt', 'amount']).default('paidAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  params: z.object({}).optional(),
});
