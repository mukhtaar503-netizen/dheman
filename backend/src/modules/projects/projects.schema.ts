import { z } from 'zod';
import { ProjectStatus, StaffResponsibility } from '@prisma/client';

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

export const assignStaffSchema = z.object({
  body: z.object({
    userIds: z.array(z.string().uuid()).min(1),
    responsibility: z.nativeEnum(StaffResponsibility),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    notes: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const updateStaffAssignmentSchema = z.object({
  body: z.object({
    responsibility: z.nativeEnum(StaffResponsibility).optional(),
    startDate: z.coerce.date().nullable().optional(),
    endDate: z.coerce.date().nullable().optional(),
    notes: z.string().nullable().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid(), staffId: z.string().uuid() }),
});

export const removeStaffAssignmentSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid(), staffId: z.string().uuid() }),
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

export const listProjectsSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    status: z.nativeEnum(ProjectStatus).optional(),
    projectManagerId: z.string().uuid().optional(),
    customerId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(100).default(20),
  }),
  params: z.object({}).optional(),
});
