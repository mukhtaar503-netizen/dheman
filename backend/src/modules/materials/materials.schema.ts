import { z } from 'zod';
import { MaterialEntryType } from '@prisma/client';

export const createMaterialEntrySchema = z.object({
  body: z.object({
    projectId: z.string().uuid(),
    taskId: z.string().uuid().optional(),
    type: z.nativeEnum(MaterialEntryType),
    itemName: z.string().min(1),
    quantity: z.number().positive(),
    unit: z.string().min(1),
    receiptUrl: z.string().url().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});
