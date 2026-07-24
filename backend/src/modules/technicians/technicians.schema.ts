import { z } from 'zod';

export const updateTechnicianProfileSchema = z.object({
  body: z.object({
    skills: z.array(z.string()).optional(),
    employmentType: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const listTechniciansSchema = z.object({
  body: z.object({}).optional(),
  query: z.object({
    skill: z.string().optional(),
    availableOnly: z.coerce.boolean().optional(),
  }),
  params: z.object({}).optional(),
});

export const requestLeaveSchema = z.object({
  body: z.object({ startDate: z.coerce.date(), endDate: z.coerce.date(), reason: z.string().optional() }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const decideLeaveSchema = z.object({
  body: z.object({ decision: z.enum(['APPROVED', 'REJECTED']) }),
  query: z.object({}).optional(),
  params: z.object({ leaveId: z.string().uuid() }),
});

export const calendarQuerySchema = z.object({
  body: z.object({}).optional(),
  query: z.object({ from: z.coerce.date(), to: z.coerce.date(), technicianId: z.string().uuid().optional() }),
  params: z.object({}).optional(),
});
