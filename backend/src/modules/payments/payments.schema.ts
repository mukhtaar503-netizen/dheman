import { z } from 'zod';
import { PaymentMethod } from '@prisma/client';

export const recordPaymentSchema = z.object({
  body: z.object({
    invoiceId: z.string().uuid(),
    amount: z.number().positive(),
    method: z.nativeEnum(PaymentMethod),
    referenceNo: z.string().optional(),
    paidAt: z.coerce.date().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const reversePaymentSchema = z.object({
  body: z.object({ reason: z.string().min(3) }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});
