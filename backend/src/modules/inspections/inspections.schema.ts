import { z } from 'zod';

export const scheduleInspectionSchema = z.object({
  body: z.object({
    serviceRequestId: z.string().uuid(),
    inspectorId: z.string().uuid(),
    scheduledAt: z.coerce.date(),
  }),
  query: z.object({}).optional(),
  params: z.object({}).optional(),
});

export const rescheduleInspectionSchema = z.object({
  body: z.object({
    scheduledAt: z.coerce.date().optional(),
    inspectorId: z.string().uuid().optional(),
    cancelReason: z.string().optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});

export const submitInspectionSchema = z.object({
  body: z.object({
    accessNotes: z.string().optional(),
    checklistItems: z.array(z.object({ key: z.string(), label: z.string(), value: z.any().optional() })).optional(),
    measurements: z
      .array(
        z.object({
          label: z.string(),
          length: z.number().optional(),
          width: z.number().optional(),
          height: z.number().optional(),
          unit: z.string().optional(),
          area: z.number().optional(),
        }),
      )
      .optional(),
    photos: z.array(z.object({ fileUrl: z.string().url(), caption: z.string().optional() })).optional(),
  }),
  query: z.object({}).optional(),
  params: z.object({ id: z.string().uuid() }),
});
