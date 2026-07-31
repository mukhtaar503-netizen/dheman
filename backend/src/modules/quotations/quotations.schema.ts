import { z } from 'zod';
import { QuotationItemCategory, QuotationStatus } from '@prisma/client';

const lineItemSchema = z.object({
  serviceCategoryId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  category: z.nativeEnum(QuotationItemCategory),
  itemName: z.string().optional(),
  description: z.string().min(1),
  quantity: z.number().positive(),
  unit: z.string().min(1),
  unitPrice: z.number().min(0),
});

export const createQuotationSchema = z.object({
  body: z.object({
    serviceRequestId: z.string().uuid(),
    siteInspectionId: z.string().uuid().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    lineItems: z.array(lineItemSchema).min(1),
    discountType: z.enum(['PERCENTAGE', 'FIXED']).optional(),
    discountValue: z.number().min(0).optional(),
    discountReason: z.string().optional(),
    vatPercentage: z.number().min(0).max(100).optional(),
    validityDays: z.number().int().positive().optional(),
    notes: z.string().optional(),
    termsAndConditions: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const reviseQuotationSchema = createQuotationSchema;

/** General edits — DRAFT only. Status changes go through the dedicated /status endpoint. */
export const updateQuotationSchema = z.object({
  body: z.object({
    title: z.string().nullable().optional(),
    description: z.string().nullable().optional(),
    lineItems: z.array(lineItemSchema).min(1).optional(),
    discountType: z.enum(['PERCENTAGE', 'FIXED']).nullable().optional(),
    discountValue: z.number().min(0).nullable().optional(),
    discountReason: z.string().nullable().optional(),
    vatPercentage: z.number().min(0).max(100).optional(),
    validityDays: z.number().int().positive().optional(),
    notes: z.string().nullable().optional(),
    termsAndConditions: z.string().nullable().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const updateQuotationStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(QuotationStatus),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const respondQuotationSchema = z.object({
  body: z.object({
    decision: z.enum(['APPROVED', 'REJECTED']),
    comments: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

const sortOptions = ['newest', 'oldest', 'amount_high', 'amount_low'] as const;

export const listQuotationsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    status: z.nativeEnum(QuotationStatus).optional(),
    customerId: z.string().uuid().optional(),
    search: z.string().optional(),
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    amountMin: z.coerce.number().min(0).optional(),
    amountMax: z.coerce.number().min(0).optional(),
    sort: z.enum(sortOptions).default('newest'),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  params: z.object({}).optional(),
});

export const quotationIdParamsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});
