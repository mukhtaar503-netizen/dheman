import { z } from 'zod';
import { ExpenseCategory } from '@prisma/client';

export const createExpenseSchema = z.object({
  body: z.object({
    projectId: z.string().uuid().optional(),
    category: z.nativeEnum(ExpenseCategory),
    amount: z.number().positive(),
    date: z.coerce.date(),
    description: z.string().optional(),
    receiptUrl: z.string().url().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const decideExpenseSchema = z.object({
  body: z.object({ decision: z.enum(['APPROVED', 'REJECTED']), rejectionReason: z.string().optional() }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const listExpensesSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    projectId: z.string().uuid().optional(),
    status: z.enum(['SUBMITTED', 'APPROVED', 'REJECTED']).optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  params: z.object({}).optional(),
});
