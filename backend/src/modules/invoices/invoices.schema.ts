import { z } from 'zod';

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().min(0),
});

export const createInvoiceSchema = z.object({
  body: z.object({
    projectId: z.string().uuid(),
    lineItems: z.array(lineItemSchema).min(1),
    dueDate: z.coerce.date().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const voidInvoiceSchema = z.object({
  body: z.object({ reason: z.string().min(3) }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const listInvoicesSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    projectId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    status: z.enum(['DRAFT', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  params: z.object({}).optional(),
});
