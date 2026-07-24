import { z } from 'zod';

export const createProjectFromQuotationSchema = z.object({
  body: z.object({
    quotationId: z.string().uuid(),
    projectManagerId: z.string().uuid(),
    startDate: z.coerce.date().optional(),
    targetEndDate: z.coerce.date().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const updateProjectSchema = z.object({
  body: z.object({
    projectManagerId: z.string().uuid().optional(),
    startDate: z.coerce.date().optional(),
    targetEndDate: z.coerce.date().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const holdOrCancelSchema = z.object({
  body: z.object({ reason: z.string().min(3) }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const addSupervisorSchema = z.object({
  body: z.object({ userId: z.string().uuid() }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const createMilestoneSchema = z.object({
  body: z.object({ name: z.string().min(2), targetDate: z.coerce.date().optional() }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const completeMilestoneSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid(), milestoneId: z.string().uuid() }),
});

export const addDocumentSchema = z.object({
  body: z.object({ fileUrl: z.string().url(), fileName: z.string().min(1) }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});
