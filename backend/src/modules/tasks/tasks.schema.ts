import { z } from 'zod';
import { TaskPriority } from '@prisma/client';

export const createTaskSchema = z.object({
  body: z.object({
    projectId: z.string().uuid(),
    title: z.string().min(2),
    description: z.string().optional(),
    priority: z.nativeEnum(TaskPriority).optional(),
    dueDate: z.coerce.date().optional(),
    dependsOnTaskId: z.string().uuid().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const assignTechniciansSchema = z.object({
  body: z.object({ technicianIds: z.array(z.string().uuid()).min(1) }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const updateTaskStatusSchema = z.object({
  body: z.object({ note: z.string().optional() }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const reopenTaskSchema = z.object({
  body: z.object({ reason: z.string().min(3) }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const addPhotoSchema = z.object({
  body: z.object({ fileUrl: z.string().url(), caption: z.string().optional(), type: z.enum(['BEFORE', 'PROGRESS', 'AFTER']).optional() }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const logTimeSchema = z.object({
  body: z.object({ startedAt: z.coerce.date(), endedAt: z.coerce.date().optional(), note: z.string().optional() }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});
