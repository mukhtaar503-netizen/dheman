import { z } from 'zod';

export const createServiceCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2),
    code: z.string().min(2).toUpperCase(),
    description: z.string().optional(),
    unitOfMeasure: z.string().min(1),
    basePrice: z.number().min(0).optional(),
    checklistTemplate: z
      .array(z.object({ key: z.string(), label: z.string() }))
      .optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateServiceCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2).optional(),
    description: z.string().optional(),
    unitOfMeasure: z.string().min(1).optional(),
    basePrice: z.number().min(0).optional(),
    checklistTemplate: z.array(z.object({ key: z.string(), label: z.string() })).optional(),
    isActive: z.boolean().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});
