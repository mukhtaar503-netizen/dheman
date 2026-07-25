import { z } from 'zod';
import { QuotationStatus } from '@prisma/client';

const lineItemSchema = z.object({
  serviceCategoryId: z.string().uuid().optional(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  unitPrice: z.number().min(0),
});

export const createQuotationSchema = z.object({
  body: z.object({
    serviceRequestId: z.string().uuid(),
    lineItems: z.array(lineItemSchema).min(1),
    discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
    discountValue: z.number().min(0).optional(),
    discountReason: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const reviseQuotationSchema = createQuotationSchema;

export const respondQuotationSchema = z.object({
  body: z.object({
    decision: z.enum(['APPROVED', 'REJECTED']),
    comment: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const listQuotationsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    status: z.nativeEnum(QuotationStatus).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  params: z.object({}).optional(),
});
